/**
 * Extract TCDB front-thumbnail URLs for a player's vault from the scraped page
 * cache (legends-vault/.cache/<player>/p*.html) — no network. Writes
 * legends-vault/data/<player>/image-urls.json ([{cid, url}]) for fetch-images.ts.
 *
 * Each scanned card has a Thumb2 (FRONT) and a Thumb4 (back); we want the front.
 * Sport segment comes from the player config (Baseball vs Basketball).
 *
 *   npx tsx legends-vault/extract-image-urls.ts --player clemente
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getPlayer } from "./config";

const player = getPlayer(process.argv.slice(2));
const HERE = new URL(".", import.meta.url).pathname;
const CACHE_DIR = join(HERE, ".cache", player.key);
const DATA_DIR = join(HERE, "data", player.key);
const BASE = "https://www.tcdb.com";

function main() {
  if (!existsSync(CACHE_DIR)) { console.error(`No cache for ${player.key} — run scrape first.`); process.exit(1); }
  mkdirSync(DATA_DIR, { recursive: true });
  const files = readdirSync(CACHE_DIR).filter((f) => /^y\d+p\d+\.html$/.test(f));
  const byCid = new Map<number, string>();
  const re = new RegExp(`/Images/Thumbs/${player.sport}/(\\d+)/\\1_(\\d+)Thumb2\\.jpg`, "g");
  for (const f of files) {
    const html = readFileSync(join(CACHE_DIR, f), "utf8");
    for (const m of html.matchAll(re)) {
      const cid = Number(m[2]);
      if (!byCid.has(cid)) byCid.set(cid, `${BASE}${m[0]}`);
    }
  }
  const out = [...byCid.entries()].map(([cid, url]) => ({ cid, url }));
  writeFileSync(join(DATA_DIR, "image-urls.json"), JSON.stringify(out, null, 2));
  console.log(`Wrote legends-vault/data/${player.key}/image-urls.json — ${out.length} front URLs from ${files.length} cached pages.`);
}
main();
