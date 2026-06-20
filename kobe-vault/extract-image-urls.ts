/**
 * Extract TCDB thumbnail URLs for Kobe Vault cards from the already-scraped page
 * cache (kobe-vault/.cache/p*.html) — no network. Writes kobe-vault/data/image-urls.json
 * ([{cid, url}]) for kobe-vault/fetch-images.ts to download.
 *
 * Thumbnail filenames embed the card id: /Images/Thumbs/Basketball/{sid}/{sid}_{cid}Thumb4.jpg
 * "RepThumb" entries are generic placeholders (not the actual card) and are skipped.
 *
 *   npx tsx kobe-vault/extract-image-urls.ts
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const HERE = new URL(".", import.meta.url).pathname;
const CACHE_DIR = join(HERE, ".cache");
const DATA_DIR = join(HERE, "data");
const BASE = "https://www.tcdb.com";

function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  const files = readdirSync(CACHE_DIR).filter((f) => /^p\d+\.html$/.test(f));
  const byCid = new Map<number, string>();
  const re = /\/Images\/Thumbs\/Basketball\/(\d+)\/\1_(\d+)Thumb4\.jpg/g;
  for (const f of files) {
    const html = readFileSync(join(CACHE_DIR, f), "utf8");
    for (const m of html.matchAll(re)) {
      const cid = Number(m[2]);
      if (!byCid.has(cid)) byCid.set(cid, `${BASE}${m[0]}`);
    }
  }
  const out = [...byCid.entries()].map(([cid, url]) => ({ cid, url }));
  writeFileSync(join(DATA_DIR, "image-urls.json"), JSON.stringify(out, null, 2));
  console.log(`Wrote kobe-vault/data/image-urls.json — ${out.length} thumbnail URLs from ${files.length} cached pages.`);
}
main();
