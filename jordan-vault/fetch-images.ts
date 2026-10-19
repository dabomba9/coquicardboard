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
import { candidateUrls, isRepUrl, type CandidateKind } from "./image-urls";

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
// Re-fetch fronts that were saved from a TCDB "Rep" stand-in, keeping a real scan
// only if one exists now (see image-urls.ts). Implies fronts only.
const repUpgrade = args.includes("--rep-upgrade");
// Cards confirmed to have no scan at any address are remembered here and skipped
// next run (restarts were spending ~10 min re-asking the same ~180 oddballs).
// --retry-missing ignores the list.
const NO_SCAN_FILE = join(HERE, ".cache", "no-scan.json");
const retryMissing = args.includes("--retry-missing");

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
  // Skip ones already downloaded (resumable). --rep-upgrade inverts this for
  // Rep-sourced fronts: those are on disk but aren't the actual card.
  const noScan: Set<string> = retryMissing || !existsSync(NO_SCAN_FILE)
    ? new Set() : new Set(JSON.parse(await readFile(NO_SCAN_FILE, "utf8")) as string[]);
  const todo: Job[] = [];
  for (const j of jobs) {
    if (!repUpgrade && noScan.has(`${j.id}-${j.side}`)) continue;
    const onDisk = existsSync(join(OUT, `${j.id}-${j.side}.jpg`));
    if (repUpgrade ? !(j.side === "front" && onDisk && isRepUrl(j.url)) : onDisk) continue;
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

  // null = no image at this address; "throttled" = TCDB said slow down (429/503);
  // "challenge" = Cloudflare wants the human check again (403 / cf-mitigated). Neither
  // of the last two may ever be mistaken for "this card has no scan".
  type Fetched = Buffer | "throttled" | "challenge" | null;
  let retryAfterSec = 0;
  const fetchViaPage = async (u: string): Promise<Fetched> => {
    try {
      // domcontentloaded, not commit: with commit the body/headers of a direct
      // image navigation weren't reliably available yet.
      const res = await page.goto(u, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!res) return null;
      if (res.status() === 403 || res.headers()["cf-mitigated"] === "challenge") return "challenge";
      if (res.status() === 429 || res.status() === 503) {
        retryAfterSec = Number(res.headers()["retry-after"]) || 0;
        return "throttled";
      }
      if (!res.ok()) return null;
      const buf = Buffer.from(await res.body());
      const ct = (res.headers()["content-type"] ?? "").split(";")[0].trim();
      return looksLikeImage(ct, buf) ? buf : null;
    } catch {
      return null;
    }
  };

  let stop = false;
  process.on("SIGINT", () => { stop = true; process.stdout.write("\n(stopping after current image…)\n"); });
  // Interruptible sleep, so Ctrl-C doesn't wait out a 15-minute backoff.
  const nap = async (ms: number) => { for (let t = 0; t < ms && !stop; t += 1000) await sleep(Math.min(1000, ms - t)); };

  // Exponential backoff on throttling: 60s, 2m, 4m… capped at 15m, or TCDB's own
  // Retry-After when it sends one. Resets after any successful image.
  let level = 0, pauses = 0, waitedMs = 0;
  const backoff = async () => {
    const ms = Math.min(retryAfterSec > 0 ? retryAfterSec * 1000 : 60_000 * 2 ** level, 15 * 60_000);
    level++; pauses++; waitedMs += ms;
    console.log(`  ⏸ TCDB rate limit — waiting ${Math.round(ms / 1000)}s (pause #${pauses})`);
    await nap(ms);
  };
  // A scan TCDB is known to serve at a plain Cards/ address (vault #656's front), for
  // telling a dead session apart from a run of unscanned cards. Not a Large/ URL:
  // that path is throttled hardest and would read as "still blocked".
  const KNOWN_GOOD = "https://www.tcdb.com/Images/Cards/Basketball/2127/2127-2909433Fr.jpg";
  // Cloudflare re-challenged the session. Observed pattern: after a burst of ~60-120
  // images TCDB challenges every request, then clears on its own after a cool-down.
  // So: show the check in the Chrome window (the human may click it to clear sooner)
  // and probe once a minute for up to an hour. The probe is cache-busted — a cached
  // copy of the test image "passed" while the session was blocked.
  let challenges = 0, challengeMs = 0;
  const waitForClearance = async (): Promise<boolean> => {
    challenges++;
    const t = Date.now();
    console.log("  ⚠ TCDB/Cloudflare is challenging requests — waiting for it to clear (or click 'Verify you are human' in the Chrome window)…");
    const tab = ctx.pages().find((p) => p !== page) ?? page;
    await tab.goto("https://www.tcdb.com/", { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => {});
    await tab.bringToFront().catch(() => {});
    for (let i = 1; i <= 60 && !stop; i++) {
      await nap(60_000);
      const r = await fetchViaPage(`${KNOWN_GOOD}?nc=${Date.now()}`);
      if (r instanceof Buffer) {
        challengeMs += Date.now() - t;
        console.log(`  ✓ cleared after ${i} min — resuming`);
        return true;
      }
      if (i % 10 === 0) console.log(`  …still blocked (${i} min)`);
    }
    challengeMs += Date.now() - t;
    return false;
  };
  // Fetch one address, waiting out throttling / re-checks and retrying the SAME address.
  const fetchPatiently = async (u: string): Promise<Buffer | null> => {
    for (;;) {
      if (stop) return null;
      const r = await fetchViaPage(u);
      if (r === "throttled") { await backoff(); continue; }
      if (r === "challenge") {
        // Cloudflare challenges individual addresses too — repeated requests for
        // files that don't exist (the no-scan cards) start drawing 403s while the
        // session itself is fine. If a fresh TCDB image still loads, this address
        // is the problem: treat it as "no image here", don't wait.
        if ((await fetchViaPage(`${KNOWN_GOOD}?nc=${Date.now()}`)) instanceof Buffer) return null;
        if (await waitForClearance()) continue;
        console.log("  ✗ still blocked after 60 min — stopping (resumable).");
        stop = true; return null;
      }
      if (r) level = 0;
      return r;
    }
  };
  // The stored address still works for most cards; the rest have moved. Try the
  // same card id's addresses cheapest-first (see image-urls.ts).
  const fetchBest = async (u: string): Promise<{ buf: Buffer; kind: CandidateKind; url: string } | null> => {
    for (const c of candidateUrls(u)) {
      const buf = await fetchPatiently(c.url);
      if (buf) return { buf, kind: c.kind, url: c.url };
      if (stop) return null;
      await sleep(500);
    }
    return null;
  };

  // A long *consecutive* miss streak (every address genuinely missing, not
  // throttled) is either a dead session or a stretch of cards TCDB never scanned.
  let ok = 0, fail = 0, done = 0, streak = 0, blocked = false;
  let lastGood: string | null = null;
  const noScan: Set<string> = existsSync(NO_SCAN_FILE) && !retryMissing
    ? new Set(JSON.parse(await readFile(NO_SCAN_FILE, "utf8")) as string[]) : new Set();
  const kinds: Record<string, number> = {};
  const t0 = Date.now();
  const progress = () => {
    const min = (Date.now() - t0) / 60_000;
    const rate = done / Math.max(min, 1e-9);
    const eta = rate > 0 ? (jobs.length - done) / rate : 0;
    return `${done}/${jobs.length} (ok ${ok}, fail ${fail}) · ${min.toFixed(1)} min · ${rate.toFixed(0)}/min · ETA ${eta.toFixed(0)} min · paused ${pauses}x/${(waitedMs / 60_000).toFixed(0)} min · challenged ${challenges}x/${(challengeMs / 60_000).toFixed(0)} min · ${JSON.stringify(kinds)}`;
  };
  for (const j of jobs) {
    if (stop) break;
    const got = await fetchBest(j.url);
    if (stop && !got) break; // interrupted mid-card: don't count it as a miss
    if (got) {
      await writeFile(join(OUT, `${j.id}-${j.side}.jpg`), got.buf);
      kinds[got.kind] = (kinds[got.kind] ?? 0) + 1;
      if (got.kind !== "external") lastGood = got.url; // the session check must hit TCDB, not eBay
      ok++; streak = 0;
    } else {
      fail++; streak++;
      if (!stop) noScan.add(`${j.id}-${j.side}`);
    }
    if (done % 25 === 0) await writeFile(NO_SCAN_FILE, JSON.stringify([...noScan]));
    if (streak >= 25) {
      if (await fetchPatiently(lastGood ?? KNOWN_GOOD)) streak = 0;
      else if (!stop) { blocked = true; break; }
    }
    if (++done % 25 === 0 || done === jobs.length) console.log(`  ${progress()}`);
    // ~15 cards/min: TCDB challenges after short bursts, so a steady trickle beats
    // fast-then-blocked (see waitForClearance).
    await sleep(3000);
  }
  await writeFile(NO_SCAN_FILE, JSON.stringify([...noScan]));
  if (blocked) console.log("⚠ 25 cards in a row with no image at any address — the Cloudflare session likely expired. Re-solve the check at tcdb.com in the Chrome window, then re-run --cdp (resumable).");
  await page.close().catch(() => {});
  await browser.close(); // disconnects only — leaves the user's Chrome open
  const remaining = repUpgrade ? jobs.length - ok : jobs.filter((j) => !existsSync(join(OUT, `${j.id}-${j.side}.jpg`))).length;
  console.log(`CDP run done in ${((Date.now() - t0) / 60_000).toFixed(1)} min (${pauses} rate-limit pauses, ${(waitedMs / 60_000).toFixed(0)} min waiting, ${challenges} Cloudflare challenges / ${(challengeMs / 60_000).toFixed(0)} min blocked). saved ${ok}, failed ${fail}${repUpgrade ? `; ${remaining} fronts still from a Rep stand-in` : `; ${remaining} still missing (resumable)`}. sources: ${JSON.stringify(kinds)}`);
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
