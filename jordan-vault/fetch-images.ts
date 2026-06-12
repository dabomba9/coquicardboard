/**
 * Download Jordan Vault card images (front + back) from the tcdb.com URLs in
 * data/cards.json into ../public/vault/{id}-front.jpg / {id}-back.jpg.
 *
 * tcdb is behind Cloudflare, which blocks plain server fetches — so we drive a
 * real headless Chromium (Playwright): warm up tcdb.com once to obtain the
 * cf_clearance cookie, then pull each image through that browser context
 * (shares cookies + TLS fingerprint). Resumable (skips files already on disk).
 *
 *   npx tsx jordan-vault/fetch-images.ts --limit 5     # spike / smoke test
 *   npx tsx jordan-vault/fetch-images.ts               # full run (front+back)
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

async function main() {
  await mkdir(OUT, { recursive: true });
  const jobs = await buildJobs();
  if (jobs.length === 0) { console.log("Nothing to download (all present?)."); return; }
  console.log(`To download: ${jobs.length} images → public/vault/`);

  const browser = await chromium.launch({ headless: true });

  // Each worker is an INDEPENDENT browser context with its OWN Cloudflare
  // clearance — so N can run in parallel without tripping the single-session
  // rate limit that throttled a shared-cookie burst. Each worker still goes
  // sequentially internally (gentle) and re-warms periodically / on failures.
  // Default to 1 (sequential): tcdb/Cloudflare rate-limits per-IP, and parallel
  // contexts from one IP trip a hard block. Override with WORKERS=N only from a
  // fresh IP / after a long cooldown.
  const WORKERS = Math.max(1, Number(process.env.WORKERS ?? args[args.indexOf("--workers") + 1] ?? 1) || 1);
  let ok = 0, fail = 0, done = 0;

  async function runShard(shard: Job[], label: number) {
    const context = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } });
    const req = context.request;
    const page = await context.newPage();
    const warmup = async () => {
      await page.goto("https://www.tcdb.com/", { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => {});
      await sleep(5000);
    };
    await warmup();
    let sinceWarm = 0, streak = 0;
    for (const j of shard) {
      let buf = await fetchImage(req, j.url);
      if (!buf) { await warmup(); sinceWarm = 0; buf = await fetchImage(req, j.url); } // retry after re-warm
      if (buf) { await writeFile(join(OUT, `${j.id}-${j.side}.jpg`), buf); ok++; streak = 0; }
      else { fail++; streak++; }
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
  await Promise.all(shards.map((s, i) => runShard(s, i)));
  process.stdout.write("\n");

  await browser.close();
  console.log(`Done. saved ${ok}, failed ${fail}.`);
  // Surface a sample saved file size so the caller can sanity-check it's a real image.
  const sample = jobs.find((j) => existsSync(join(OUT, `${j.id}-${j.side}.jpg`)));
  if (sample) {
    const s = await stat(join(OUT, `${sample.id}-${sample.side}.jpg`));
    console.log(`  sample ${sample.id}-${sample.side}.jpg = ${s.size} bytes`);
  }
}

main().catch((e) => { console.error("\nfetch-images failed:", e); process.exit(1); });
