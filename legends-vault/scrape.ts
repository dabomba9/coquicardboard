/**
 * Generalized TCDB vault scraper — pulls a player's full TCDB card list into
 * legends-vault/data/<player>/cards.json (facts only; no images). Parameterized by
 * --player (see legends-vault/config.ts).
 *
 * TCDB is behind Cloudflare, so this attaches to a Chrome you launch + clear:
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     --remote-debugging-port=9222 --user-data-dir="$HOME/.cf-chrome" "https://www.tcdb.com/"
 *
 *   npx tsx legends-vault/scrape.ts --player clemente --inspect   # dump page 1 (debug)
 *   npx tsx legends-vault/scrape.ts --player clemente --pages 3   # smoke test
 *   npx tsx legends-vault/scrape.ts --player clemente             # full (resumable cache)
 */
import { chromium, type Page } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CardRecord } from "./types";
import { getPlayer } from "./config";

const args = process.argv.slice(2);
const player = getPlayer(args);

const HERE = new URL(".", import.meta.url).pathname;
const CACHE_DIR = join(HERE, ".cache", player.key);
const DATA_DIR = join(HERE, "data", player.key);
// col/1 = the COMPLETE per-year checklist (base + insert + oddball + regional).
// (col/N = Insert-only tab; col/0 = a partial view that drops the flagship Topps
// base.) TCDB lumps some cross-year reprints under each year, so the crawl keeps
// only rows whose own name-year matches the loop year.
const PERSON = (year: number, pageIndex: number) =>
  `https://www.tcdb.com/Person.cfm/pid/${player.pid}/col/1/yea/${year}/${player.slugName}?PageIndex=${pageIndex}&sTeam=&sCardNum=&sNote=&sSetName=&sBrand=`;
const CDP_URL = process.env.CDP_URL ?? "http://localhost:9222";

const inspect = args.includes("--inspect");
const pagesArg = args.indexOf("--pages");
const maxPages = pagesArg >= 0 ? Number(args[pagesArg + 1]) : Infinity;
const noCache = args.includes("--no-cache");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();

// Brand family for the vault's manufacturer facet (most-specific prefix first).
// Baseball-tuned (Donruss is its own brand pre-2009; Panini owns the modern optic/etc).
const BRANDS: [string, string][] = [
  ["topps chrome", "Topps"], ["topps finest", "Topps"], ["topps heritage", "Topps"], ["topps gallery", "Topps"],
  ["topps stadium club", "Topps"], ["stadium club", "Topps"], ["topps allen", "Topps"], ["allen & ginter", "Topps"],
  ["bowman chrome", "Topps"], ["bowman", "Topps"], ["finest", "Topps"], ["gypsy queen", "Topps"], ["topps", "Topps"],
  ["sp authentic", "Upper Deck"], ["spx", "Upper Deck"], ["sp ", "Upper Deck"], ["sp-", "Upper Deck"],
  ["goodwin", "Upper Deck"], ["goudey", "Upper Deck"], ["sweet spot", "Upper Deck"], ["ud ", "Upper Deck"],
  ["upper deck", "Upper Deck"],
  ["flair", "Fleer"], ["fleer", "Fleer"], ["ultra", "Fleer"], ["e-x", "Fleer"],
  ["donruss optic", "Panini"], ["national treasures", "Panini"], ["flawless", "Panini"], ["immaculate", "Panini"],
  ["contenders", "Panini"], ["prizm", "Panini"], ["select", "Panini"], ["mosaic", "Panini"], ["chronicles", "Panini"],
  ["diamond kings", "Panini"], ["playoff", "Panini"], ["absolute", "Panini"], ["panini", "Panini"],
  ["donruss", "Donruss"], ["leaf", "Leaf"],
  ["pinnacle", "Pinnacle"], ["score", "Score"], ["pacific", "Pacific"], ["sage", "SAGE"], ["sportkings", "Sportkings"],
  ["classic", "Classic"], ["kellogg", "Kellogg's"], ["post", "Post"], ["hostess", "Hostess"],
];
function manufacturerOf(setName: string): string {
  const lower = setName.toLowerCase();
  for (const [k, m] of BRANDS) if (lower.includes(k)) return m;
  return setName.split(/\s+/).slice(0, 2).join(" ") || "Other";
}
function cardTypeOf(name: string): string {
  const n = name.toLowerCase();
  if (/\bauto(graph)?s?\b|signature|signing/.test(n)) return "Auto";
  if (/patch|jersey|relic|memorabilia|\bmaterials?\b|button|\bbat\b|\bball\b|game-used|game used/.test(n)) return "Relic";
  if (/ - /.test(name)) return "Insert";
  return "Base";
}

const NAME_SPLIT = new RegExp(`#|${player.name}`);

// Parse one Person.cfm listing page → card records (id = TCDB cid; stable).
function parseRows(html: string): CardRecord[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]).filter((r) => /ViewCard\.cfm/i.test(r));
  const out: CardRecord[] = [];
  for (const r of rows) {
    const href = r.match(/\/ViewCard\.cfm\/sid\/(\d+)\/cid\/(\d+)\//i);
    if (!href) continue;
    const cid = Number(href[2]);
    const cells = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => strip(m[1]));
    const name = cells.filter(Boolean).pop() ?? "";
    if (!name) continue;
    const year = name.match(/\b(19|20)\d{2}\b/)?.[0] ?? null;
    const cardNumber = name.match(/#([^\s]+)/)?.[1] ?? null;
    const afterYear = (year ? name.slice(name.indexOf(year) + year.length) : name)
      .replace(/^-\d{2}\s*/, "").trim();
    const setName = afterYear.split(NAME_SPLIT)[0].trim() || afterYear;
    out.push({
      id: cid, slug: slugify(name), name, year: year ? Number(year) : null,
      manufacturer: manufacturerOf(setName), brand: setName || null, cardNumber,
      cardType: cardTypeOf(name), tier: null, page: null, row: null,
      frontImage: null, backImage: null, psaPopReport: null,
    });
  }
  return out;
}

async function attach(): Promise<{ page: Page; close: () => Promise<void> } | null> {
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch {
    console.log(`Couldn't attach to Chrome at ${CDP_URL}.\nLaunch a debug Chrome first:\n  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir="$HOME/.cf-chrome" "https://www.tcdb.com/Person.cfm/pid/${player.pid}/${player.slugName}"`);
    return null;
  }
  const ctx = browser.contexts()[0];
  if (!ctx) { console.log("No browser context on the attached Chrome."); await browser.close(); return null; }
  const page = await ctx.newPage();
  return { page, close: async () => { await page.close().catch(() => {}); await browser.close(); } };
}

async function getHtml(page: Page, url: string): Promise<string | null> {
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (!res || !res.ok()) return null;
    const html = await page.content();
    if (/Just a moment|cf-challenge|Checking your browser/i.test(html)) return null;
    return html;
  } catch { return null; }
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });
  const att = await attach();
  if (!att) return;
  const { page, close } = att;

  if (inspect) {
    const y = player.startYear;
    const html = await getHtml(page, PERSON(y, 1));
    if (!html) { console.log("No HTML (Cloudflare not cleared?). Solve the check + retry."); await close(); return; }
    writeFileSync(join(CACHE_DIR, `inspect-y${y}p1.html`), html);
    const parsed = parseRows(html);
    console.log(`Inspect [${player.name} ${y}]: ${parsed.length} cards on page 1. Sample:`);
    for (const c of parsed.slice(0, 10)) console.log(`  - ${c.name}`);
    await close();
    return;
  }

  // Playing-era only: loop each issue year in [startYear, endYear] using TCDB's
  // native yea/{year} filter, paginating within each year (cache per y{year}p{page}).
  const byId = new Map<number, CardRecord>();
  let blocked = false;
  for (let year = player.startYear; year <= player.endYear && !blocked; year++) {
    let added = 0;
    // The per-year view fits on one or a few real pages; TCDB's own pager links
    // (PageIndex=N) give the true last page. (Each page also has one ROTATING
    // "featured" card from a random year — filtered out by the c.year===year check.)
    let maxPage = 1;
    for (let idx = 1; idx <= Math.min(maxPage, maxPages); idx++) {
      const cacheFile = join(CACHE_DIR, `y${year}p${idx}.html`);
      const cached = !noCache && existsSync(cacheFile);
      let html: string | null = cached ? readFileSync(cacheFile, "utf8") : null;
      if (!html) {
        html = await getHtml(page, PERSON(year, idx));
        if (!html) { console.log(`\n⚠ ${year} page ${idx}: blocked — re-solve Cloudflare in Chrome, then re-run (resumable).`); blocked = true; break; }
        writeFileSync(cacheFile, html);
        await sleep(1000);
      }
      if (idx === 1) {
        const links = [...html.matchAll(/PageIndex=(\d+)/g)].map((m) => Number(m[1]));
        maxPage = Math.min(links.length ? Math.max(...links) : 1, 10); // honor pager, cap for safety
      }
      const matched = parseRows(html).filter((c) => c.year === year); // drop the rotating featured/reprint noise
      for (const c of matched) if (!byId.has(c.id)) { byId.set(c.id, c); added++; }
    }
    process.stdout.write(`\r  ${year}: +${added} (unique ${byId.size})   `);
  }
  process.stdout.write("\n");

  const all = [...byId.values()];
  writeFileSync(join(DATA_DIR, "cards.json"), JSON.stringify(all, null, 2));
  console.log(`Wrote legends-vault/data/${player.key}/cards.json — ${all.length} cards (years ${player.startYear}–${player.endYear}).`);
  await close();
}

main().catch((e) => { console.error(e); process.exit(1); });
