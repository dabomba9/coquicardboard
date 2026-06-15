/**
 * Download Jordan Vault card images (front + back) from the tcdb.com URLs in
 * data/cards.json into ../public/vault/{id}-front.jpg / {id}-back.jpg.
 *
 * tcdb is behind Cloudflare. It now serves a managed challenge that BLOCKS any
 * Playwright-LAUNCHED browser (headless or headed) in an infinite loop — those
 * modes no longer work. The reliable path is --cdp: attach to a normal Chrome the
 * user launched themselves (and solved the challenge in), then fetch through that
 * real, human-trusted session. Caveat: tcdb rate-limits a cleared session to ~80
 * images, then needs a fresh manual solve. Resumable (skips files already on disk).
 *
 *   # 1) launch a normal Chrome with remote debugging + solve the check at tcdb.com:
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     --remote-debugging-port=9222 --user-data-dir="$HOME/.cf-chrome" "https://www.tcdb.com/"
 *   # 2) attach + fetch through that session:
 *   npx tsx jordan-vault/fetch-images.ts --cdp [--limit N]
 *
 *   npx tsx jordan-vault/fetch-images.ts               # (legacy headless — blocked now)
 *   npx tsx jordan-vault/fetch-images.ts --assist      # (Playwright headed — also blocked)
 *   npx tsx jordan-vault/fetch-images.ts --front-only  # fronts only
 */
import { chromium, type APIRequestContext } from "playwright";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const HERE = new URL(".", import.meta.url).pathname;
const OUT = join(HERE, "..", "public", "vault");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;
const frontOnly = args.includes("--front-only");
// Headed (visible) Chromium — tcdb now serves a Cloudflare managed challenge that
// headless can't auto-pass; a real window (with a manual checkbox if shown) clears it.
const headed = args.includes("--headed") || process.env.HEADED === "1";
// Assisted mode: persistent real-Chrome window the human keeps open and re-solves
// the Cloudflare check in when prompted; clearance persists between batches/runs.
const assist = args.includes("--assist");
// CDP mode: attach to a normal Chrome the user launched with --remote-debugging-port
// (NOT automation-flagged, so the human can pass Cloudflare) and fetch through that
// already-cleared real session. The reliable path past tcdb's managed challenge.
const cdp = args.includes("--cdp");

type Card = { id: number; frontImage: string | null; backImage: string | null };
type Job = { id: number; side: "front" | "back"; url: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function buildJobs(): Promise<Job[]> {
  const cards: Card[] = JSON.parse(await readFile(join(HERE, "data", "cards.json"), "utf8"));
  const jobs: Job[] = [];
  for (const c of cards) {
    if (c.frontImage) jobs.push({ id: c.id, side: "front", url: c.frontImage });
    if (!frontOnly && c.backImage) jobs.push({ id: c.id, side: "back", url: c.backImage });
  }
  // Skip ones already downloaded (resumable).
  const todo: Job[] = [];
  for (const j of jobs) {
    if (existsSync(join(OUT, `${j.id}-${j.side}.jpg`))) continue;
    todo.push(j);
  }
  return Number.isFinite(limit) ? todo.slice(0, limit) : todo;
}

/** Returns true if bytes look like a real image (not a Cloudflare HTML page). */
function looksLikeImage(contentType: string | undefined, buf: Buffer): boolean {
  if (contentType && contentType.startsWith("image/")) return true;
  if (buf.length < 1200) return false;
  const head = buf.subarray(0, 4);
  // JPEG FFD8FF, PNG 89504E47
  return (head[0] === 0xff && head[1] === 0xd8) || (head[0] === 0x89 && head[1] === 0x50);
}

// Fetch through the warmed browser context's request stack (shares cookies incl.
// cf_clearance). Proven on the residential IP; VPN/datacenter IPs are Cloudflare
// reputation-blocked regardless of method.
async function fetchImage(req: APIRequestContext, url: string): Promise<Buffer | null> {
  try {
    const res = await req.get(url, {
      headers: { Referer: "https://www.tcdb.com/", Accept: "image/avif,image/webp,image/png,image/*,*/*" },
      timeout: 30_000,
    });
    if (!res.ok()) return null;
    const buf = Buffer.from(await res.body());
    const ct = (res.headers()["content-type"] ?? "").split(";")[0].trim();
    return looksLikeImage(ct, buf) ? buf : null;
  } catch {
    return null;
  }
}

// Assisted (human-in-the-loop) run: one persistent real-Chrome window the user
// keeps open and solves the Cloudflare check in when prompted. The cf_clearance
// cookie persists in the profile dir (across re-warms AND across runs), so the
// human only re-solves every ~20-30 min. Resumable (skips files already on disk).
async function runAssisted(jobs: Job[]) {
  const PROFILE = join(HERE, ".cache", "cf-profile");
  await mkdir(PROFILE, { recursive: true });
  // Bundled Chromium (matches the proven diagnostic recipe). Persistent profile so
  // the cf_clearance cookie survives across re-warms and runs.
  const context = await chromium.launchPersistentContext(PROFILE, { headless: false, userAgent: UA, viewport: { width: 1280, height: 900 } });
  const page = context.pages()[0] ?? (await context.newPage());
  const req = context.request;

  // Validate clearance by actually pulling a real image via the request stack the
  // diagnostic proved works (a cf_clearance cookie can be present but stale). On
  // failure, drop cookies so the challenge re-appears and wait for the human.
  const probeUrl = jobs[0].url;
  const probe = async () => (await fetchImage(req, probeUrl)) !== null;
  const cleared = async () =>
    (await context.cookies("https://www.tcdb.com/").catch(() => [])).some((c) => c.name === "cf_clearance");
  const ensureCleared = async (): Promise<boolean> => {
    if (await probe()) return true; // session already valid
    await context.clearCookies().catch(() => {});
    await page.bringToFront().catch(() => {});
    await page.goto("https://www.tcdb.com/", { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => {});
    process.stdout.write("\n⏳ Bring the Chrome window to the front and click 'Verify you are human'. Take your time — this waits up to 15 min and starts automatically once solved.\n");
    for (let t = 0; t < 900; t++) {
      await sleep(1000);
      if (t > 0 && t % 60 === 0) process.stdout.write(`  …still waiting (${t / 60} min) — bring Chrome to front and click 'Verify you are human'.\n`);
      if (await cleared() && await probe()) { process.stdout.write("✓ cleared — resuming\n"); return true; }
    }
    return false;
  };

  let stop = false;
  process.on("SIGINT", () => { stop = true; process.stdout.write("\n(stopping after current image…)\n"); });

  let ok = 0, fail = 0, done = 0, streak = 0, timeouts = 0;
  if (!(await ensureCleared())) { console.log("No Cloudflare clearance — exiting (nothing saved)."); await context.close(); return; }

  for (const j of jobs) {
    if (stop) break;
    let buf = await fetchImage(req, j.url);
    if (!buf) {
      streak++;
      if (streak >= 6) { // sustained failures ⇒ clearance likely expired; ask the human to re-solve
        const ok2 = await ensureCleared();
        streak = 0;
        if (!ok2) { if (++timeouts >= 2) { console.log("\nNo clearance twice — stopping (resumable)."); break; } }
        else { timeouts = 0; buf = await fetchImage(req, j.url); }
      }
    }
    if (buf) { await writeFile(join(OUT, `${j.id}-${j.side}.jpg`), buf); ok++; streak = 0; timeouts = 0; }
    else fail++;
    if (++done % 25 === 0 || done === jobs.length) process.stdout.write(`\r  ${done}/${jobs.length} (ok ${ok}, fail ${fail})`);
    await sleep(300);
  }
  process.stdout.write("\n");
  await context.close();
  const remaining = jobs.filter((j) => !existsSync(join(OUT, `${j.id}-${j.side}.jpg`))).length;
  console.log(`Assisted run done. saved ${ok}, failed ${fail}. ${remaining} still missing (resumable).`);
  const sample = jobs.find((j) => existsSync(join(OUT, `${j.id}-${j.side}.jpg`)));
  if (sample) { const s = await stat(join(OUT, `${sample.id}-${sample.side}.jpg`)); console.log(`  sample ${sample.id}-${sample.side}.jpg = ${s.size} bytes`); }
}

// CDP run: attach to the user's manually-launched Chrome and fetch images through
// its already-cleared real session (page.goto uses the real Chrome network, the
// fingerprint cf_clearance is bound to). Leaves their Chrome open on disconnect.
async function runCDP(jobs: Job[]) {
  const url = process.env.CDP_URL ?? "http://localhost:9222";
  let browser;
  try {
    browser = await chromium.connectOverCDP(url);
  } catch {
    console.log(`Couldn't attach to Chrome at ${url}.\nLaunch a debug Chrome first:\n  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir="$HOME/.cf-chrome" "https://www.tcdb.com/"`);
    return;
  }
  const ctx = browser.contexts()[0];
  if (!ctx) { console.log("No browser context on the attached Chrome."); await browser.close(); return; }
  const page = await ctx.newPage();

  const fetchViaPage = async (u: string): Promise<Buffer | null> => {
    try {
      const res = await page.goto(u, { waitUntil: "commit", timeout: 30_000 });
      if (!res || !res.ok()) return null;
      const buf = Buffer.from(await res.body());
      const ct = (res.headers()["content-type"] ?? "").split(";")[0].trim();
      return looksLikeImage(ct, buf) ? buf : null;
    } catch {
      return null;
    }
  };

  // Many tcdb image URLs are dead (404), so we DON'T gate on a single probe. Just
  // run; only a long *consecutive* failure streak means the cleared session died.
  let stop = false;
  process.on("SIGINT", () => { stop = true; process.stdout.write("\n(stopping after current image…)\n"); });
  let ok = 0, fail = 0, done = 0, streak = 0, blocked = false;
  for (const j of jobs) {
    if (stop) break;
    const buf = await fetchViaPage(j.url);
    if (buf) { await writeFile(join(OUT, `${j.id}-${j.side}.jpg`), buf); ok++; streak = 0; }
    else { fail++; streak++; }
    if (streak >= 25) { blocked = true; break; } // session likely expired / re-challenged
    if (++done % 25 === 0 || done === jobs.length) process.stdout.write(`\r  ${done}/${jobs.length} (ok ${ok}, fail ${fail})`);
    await sleep(300);
  }
  process.stdout.write("\n");
  if (blocked) console.log("⚠ 25 failures in a row — the Cloudflare session likely expired. Re-solve the check at tcdb.com in the Chrome window, then re-run --cdp (resumable).");
  await page.close().catch(() => {});
  await browser.close(); // disconnects only — leaves the user's Chrome open
  const remaining = jobs.filter((j) => !existsSync(join(OUT, `${j.id}-${j.side}.jpg`))).length;
  console.log(`CDP run done. saved ${ok}, failed ${fail}. ${remaining} still missing (resumable).`);
  const sample = jobs.find((j) => existsSync(join(OUT, `${j.id}-${j.side}.jpg`)));
  if (sample) { const s = await stat(join(OUT, `${sample.id}-${sample.side}.jpg`)); console.log(`  sample ${sample.id}-${sample.side}.jpg = ${s.size} bytes`); }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const jobs = await buildJobs();
  if (jobs.length === 0) { console.log("Nothing to download (all present?)."); return; }
  console.log(`To download: ${jobs.length} images → public/vault/`);

  if (cdp) { await runCDP(jobs); return; }
  if (assist) { await runAssisted(jobs); return; }

  const browser = await chromium.launch({ headless: !headed });
  if (headed) {
    console.log("A browser window opened — if a Cloudflare 'verify you are human' check appears, click it; the run continues automatically once it clears.");
  }

  // Each worker is an INDEPENDENT browser context with its OWN Cloudflare
  // clearance — so N can run in parallel without tripping the single-session
  // rate limit that throttled a shared-cookie burst. Each worker still goes
  // sequentially internally (gentle) and re-warms periodically / on failures.
  // Default to 1 (sequential): tcdb/Cloudflare rate-limits per-IP, and parallel
  // contexts from one IP trip a hard block. Override with WORKERS=N only from a
  // fresh IP / after a long cooldown.
  const WORKERS = Math.max(1, Number(process.env.WORKERS ?? args[args.indexOf("--workers") + 1] ?? 1) || 1);
  const ABORT_AFTER = 20; // consecutive fails (surviving a re-warm) ⇒ this IP is blocked
  let ok = 0, fail = 0, done = 0, aborted = false;

  async function runShard(shard: Job[]) {
    const context = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } });
    const req = context.request;
    const page = await context.newPage();
    // Warm up: load a tcdb page so Cloudflare's JS challenge runs, then wait for
    // the cf_clearance cookie to confirm we actually passed before fetching.
    const warmupWaits = headed ? 90 : 20; // headed: give a manual challenge time to clear
    const warmup = async () => {
      await page.goto("https://www.tcdb.com/", { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => {});
      for (let t = 0; t < warmupWaits; t++) {
        const cookies = await context.cookies("https://www.tcdb.com/").catch(() => []);
        if (cookies.some((c) => c.name === "cf_clearance")) break;
        await sleep(1000);
      }
      await sleep(1500);
    };
    await warmup();
    let sinceWarm = 0, streak = 0, warmFails = 0;
    for (const j of shard) {
      if (aborted) break;
      let buf = await fetchImage(req, j.url);
      if (!buf) { await warmup(); sinceWarm = 0; buf = await fetchImage(req, j.url); } // retry after re-warm
      if (buf) { await writeFile(join(OUT, `${j.id}-${j.side}.jpg`), buf); ok++; streak = 0; warmFails = 0; }
      else { fail++; streak++; warmFails++; }
      // A long streak that survives re-warms means the IP is blocked — stop early.
      if (warmFails >= ABORT_AFTER) {
        aborted = true;
        process.stdout.write(`\n⚠ IP appears blocked after ${warmFails} consecutive failures — switch your VPN to a new server and re-run (progress is saved).\n`);
        break;
      }
      if (++sinceWarm >= 120 || streak >= 6) { await warmup(); sinceWarm = 0; streak = 0; }
      if (++done % 50 === 0 || done === jobs.length) process.stdout.write(`\r  ${done}/${jobs.length} (ok ${ok}, fail ${fail})`);
      await sleep(250);
    }
    await context.close();
  }

  // Round-robin the jobs across workers so each shard spans the whole catalog.
  console.log(`Warming up ${WORKERS} Cloudflare contexts…`);
  const shards: Job[][] = Array.from({ length: WORKERS }, () => []);
  jobs.forEach((j, i) => shards[i % WORKERS].push(j));
  await Promise.all(shards.map((s) => runShard(s)));
  process.stdout.write("\n");

  await browser.close();
  const remaining = jobs.filter((j) => !existsSync(join(OUT, `${j.id}-${j.side}.jpg`))).length;
  console.log(`\nDone${aborted ? " (stopped — IP blocked)" : ""}. saved ${ok} this run, ${fail} failed. ${remaining} still missing.`);
  if (remaining > 0) console.log("Re-run after switching VPN servers to continue (resumable).");
  // Surface a sample saved file size so the caller can sanity-check it's a real image.
  const sample = jobs.find((j) => existsSync(join(OUT, `${j.id}-${j.side}.jpg`)));
  if (sample) {
    const s = await stat(join(OUT, `${sample.id}-${sample.side}.jpg`));
    console.log(`  sample ${sample.id}-${sample.side}.jpg = ${s.size} bytes`);
  }
}

main().catch((e) => { console.error("\nfetch-images failed:", e); process.exit(1); });
