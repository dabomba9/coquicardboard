/**
 * Kobe Vault images — download the TCDB thumbnails listed in
 * kobe-vault/data/image-urls.json through the user's CDP-attached Chrome (TCDB is
 * Cloudflare-walled), and upload each to the shared `vault-images` Storage bucket
 * as {cid}-front.jpg. Then run admin/reconcile-vault-images.ts kobe-vault to set
 * cards.image_url.
 *
 *   # Chrome (solve Cloudflare, leave open) — same as the scrape:
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     --remote-debugging-port=9222 --user-data-dir="$HOME/.cf-chrome" "https://www.tcdb.com/"
 *
 *   npx tsx kobe-vault/fetch-images.ts --limit 20   # test the rate-limit first
 *   npx tsx kobe-vault/fetch-images.ts              # full (resumable: skips bucket-present)
 */
import { config } from "dotenv";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

const HERE = new URL(".", import.meta.url).pathname;
const CDP_URL = process.env.CDP_URL ?? "http://localhost:9222";
const BUCKET = "vault-images";
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;
// --force re-fetches cids already in the bucket (upsert overwrites). Needed to
// replace the old Thumb4 backs with the new Thumb2 fronts at the same object key.
const force = process.argv.includes("--force");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) { console.error("Missing Supabase env in .env.local"); process.exit(1); }
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function looksLikeImage(ct: string | undefined, buf: Buffer): boolean {
  if (ct && ct.startsWith("image/")) return true;
  if (buf.length < 1200) return false;
  const h = buf.subarray(0, 4);
  return (h[0] === 0xff && h[1] === 0xd8) || (h[0] === 0x89 && h[1] === 0x50);
}

// Front cids already in the bucket (resumable: skip them).
async function presentFronts(): Promise<Set<number>> {
  const present = new Set<number>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list("", { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    if (!data.length) break;
    for (const o of data) { const m = /^(\d+)-front\.jpg$/.exec(o.name); if (m) present.add(Number(m[1])); }
    if (data.length < 1000) break;
  }
  return present;
}

async function main() {
  const all: { cid: number; url: string }[] = JSON.parse(readFileSync(join(HERE, "data", "image-urls.json"), "utf8"));
  let browser;
  try { browser = await chromium.connectOverCDP(CDP_URL); }
  catch {
    console.log(`Couldn't attach to Chrome at ${CDP_URL}.\nLaunch a debug Chrome + solve Cloudflare first:\n  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir="$HOME/.cf-chrome" "https://www.tcdb.com/"`);
    return;
  }
  const ctx = browser.contexts()[0];
  if (!ctx) { console.log("No browser context on the attached Chrome."); await browser.close(); return; }
  const page = await ctx.newPage();

  const done = await presentFronts();
  const kobeDoneBefore = all.filter((x) => done.has(x.cid)).length; // Kobe cids already uploaded
  const pending = force ? all : all.filter((x) => !done.has(x.cid));
  const todo = pending.slice(0, Number.isFinite(limit) ? limit : undefined);
  console.log(`Kobe thumbnails: ${kobeDoneBefore}/${all.length} already in bucket.${force ? " --force: re-fetching all." : ""} Fetching ${todo.length}…`);

  let ok = 0, fail = 0, streak = 0, blocked = false;
  for (let i = 0; i < todo.length; i++) {
    const { cid, url: u } = todo[i];
    try {
      const res = await page.goto(u, { waitUntil: "commit", timeout: 30_000 });
      const buf = res ? Buffer.from(await res.body()) : Buffer.alloc(0);
      const ct = (res?.headers()["content-type"] ?? "").split(";")[0].trim();
      if (res && res.ok() && looksLikeImage(ct, buf)) {
        const { error } = await db.storage.from(BUCKET).upload(`${cid}-front.jpg`, buf, { contentType: "image/jpeg", upsert: true });
        if (error) throw new Error(error.message);
        ok++; streak = 0;
      } else { fail++; streak++; }
    } catch { fail++; streak++; }
    if (streak >= 25) { blocked = true; break; }
    if ((i + 1) % 25 === 0 || i + 1 === todo.length) process.stdout.write(`\r  ${i + 1}/${todo.length} (ok ${ok}, fail ${fail})`);
    await sleep(400);
  }
  process.stdout.write("\n");
  if (blocked) console.log("⚠ 25 failures in a row — the Cloudflare session likely expired. Re-solve the check at tcdb.com in the Chrome window, then re-run (resumable).");
  await page.close().catch(() => {});
  await browser.close(); // disconnect only — leaves the user's Chrome open
  console.log(`Done. uploaded ${ok}, failed ${fail}. (${all.length - kobeDoneBefore - ok} Kobe thumbnails still missing — resumable.)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
