/**
 * Jordan Vault scraper — pulls the full Michael Jordan card catalog from
 * jordan-vault.com into a standalone JSON + CSV dataset.
 *
 * INDEPENDENT of the Coqui Cardboard app: no Supabase, no `@/` imports, no
 * writes outside this folder. The site exposes a clean public JSON API
 * (robots.txt allows /cards), so no HTML parsing / headless browser is needed.
 *
 *   enumerate:  GET /api/cards?page=N&limit=250   -> all card ids (paginated)
 *   detail:     GET /api/cards/{id}               -> full per-card fields
 *   enrich:     /sitemap.xml                       -> canonical url + slug per id
 *
 * Run:
 *   npx tsx jordan-vault/scrape.ts                 # full catalog (~12k cards)
 *   npx tsx jordan-vault/scrape.ts --limit 5       # first 5 ids (smoke test)
 *   npx tsx jordan-vault/scrape.ts --no-cache      # ignore the on-disk cache
 */
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ApiCard, CardRecord } from "./types.ts";

const BASE = "https://jordan-vault.com";
const UA = "CoquiCardboardResearch/1.0 (+personal card catalog; contact dr33d9@gmail.com)";
const HERE = new URL(".", import.meta.url).pathname;
const CACHE_DIR = join(HERE, ".cache");
const DATA_DIR = join(HERE, "data");
const CONCURRENCY = 5;
const DELAY_MS = 120; // small politeness gap between request starts

const args = process.argv.slice(2);
const noCache = args.includes("--no-cache");
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string, tries = 4): Promise<T> {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} (non-retryable)`);
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === tries) throw err;
      await sleep(400 * attempt * attempt); // backoff: 0.4s, 1.6s, 3.6s
    }
  }
  throw new Error("unreachable");
}

/** Map id -> { url, slug } from the sitemap (regex; no XML dependency). */
async function loadSitemap(): Promise<Map<number, { url: string; slug: string }>> {
  const xml = await (await fetch(`${BASE}/sitemap.xml`, { headers: { "User-Agent": UA } })).text();
  const map = new Map<number, { url: string; slug: string }>();
  for (const m of xml.matchAll(/<loc>([^<]+\/cards\/(\d+)-([^<]+))<\/loc>/g)) {
    map.set(Number(m[2]), { url: m[1], slug: m[3] });
  }
  return map;
}

/** Enumerate every card id via the paginated list endpoint. */
async function loadAllIds(): Promise<number[]> {
  const first = await fetchJson<{ cards: { id: number }[]; totalPages: number; total: number }>(
    `${BASE}/api/cards?page=1&limit=250`
  );
  const ids = first.cards.map((c) => c.id);
  process.stdout.write(`Enumerating ${first.total} cards over ${first.totalPages} pages: 1`);
  for (let page = 2; page <= first.totalPages; page++) {
    const d = await fetchJson<{ cards: { id: number }[] }>(`${BASE}/api/cards?page=${page}&limit=250`);
    ids.push(...d.cards.map((c) => c.id));
    process.stdout.write(`…${page}`);
    await sleep(DELAY_MS);
  }
  process.stdout.write("\n");
  return ids;
}

async function getDetail(id: number): Promise<ApiCard> {
  const cacheFile = join(CACHE_DIR, `${id}.json`);
  if (!noCache && existsSync(cacheFile)) {
    return JSON.parse(await readFile(cacheFile, "utf8")) as ApiCard;
  }
  const card = await fetchJson<ApiCard>(`${BASE}/api/cards/${id}`);
  await writeFile(cacheFile, JSON.stringify(card));
  return card;
}

function normalize(c: ApiCard, site?: { url: string; slug: string }): CardRecord {
  const h = c.hierarchy?.match(/Tier\s*(\d+)-Page\s*(\d+)-Row\s*(\d+)/i);
  const yr = c.year ? Number(c.year) : null;
  return {
    id: c.id,
    indexNumber: c.indexNumber ?? null,
    sourceUrl: site?.url ?? null,
    slug: site?.slug ?? null,
    name: c.cardName ?? null,
    year: Number.isFinite(yr) ? yr : null,
    manufacturer: c.manufacturer ?? null,
    brand: c.brand ?? null,
    cardNumber: c.cardNumber ?? null,
    cardType: c.cardType ?? null,
    hierarchy: c.hierarchy ?? null,
    tier: h ? Number(h[1]) : null,
    page: h ? Number(h[2]) : null,
    row: h ? Number(h[3]) : null,
    frontImage: c.frontLink ?? null,
    backImage: c.backLink ?? null,
    hasFrontImage: !!c.hasFrontImage,
    hasBackImage: !!c.hasBackImage,
    playerOdds: c.playerOdds ?? null,
    psaPopReport: c.psaPopReport ?? null,
    ebaySoldListings: c.ebaySoldListings ?? null,
  };
}

/** Run `worker` over `items` with a fixed concurrency cap. */
async function mapPool<T, R>(items: T[], cap: number, worker: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i], i);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: Math.min(cap, items.length) }, run));
  return out;
}

function toCsv(rows: CardRecord[]): string {
  const cols = Object.keys(rows[0] ?? {}) as (keyof CardRecord)[];
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n") + "\n";
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  const sitemap = await loadSitemap();
  console.log(`Sitemap: ${sitemap.size} card URLs.`);

  let ids = await loadAllIds();
  if (Number.isFinite(limit)) ids = ids.slice(0, limit);
  console.log(`Fetching detail for ${ids.length} cards (concurrency ${CONCURRENCY})…`);

  let done = 0;
  const records = await mapPool(ids, CONCURRENCY, async (id) => {
    const rec = normalize(await getDetail(id), sitemap.get(id));
    if (++done % 250 === 0 || done === ids.length) process.stdout.write(`\r  ${done}/${ids.length}`);
    return rec;
  });
  process.stdout.write("\n");

  records.sort((a, b) => a.id - b.id);
  await writeFile(join(DATA_DIR, "cards.json"), JSON.stringify(records, null, 2));
  await writeFile(join(DATA_DIR, "cards.csv"), toCsv(records));

  const withImg = records.filter((r) => r.frontImage).length;
  const cachedN = (await readdir(CACHE_DIR)).length;
  console.log(
    `\nDone. ${records.length} cards → data/cards.json + data/cards.csv` +
      `\n  ${withImg} with a front image · ${cachedN} cached detail responses`
  );
}

main().catch((e) => {
  console.error("\nScrape failed:", e);
  process.exit(1);
});
