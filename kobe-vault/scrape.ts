/**
 * Kobe Vault scraper — pulls the full Kobe Bryant card list from TCDB's player
 * checklist into kobe-vault/data/cards.json (facts only; no images).
 *
 * TCDB is behind Cloudflare, so this uses the same --cdp attach as
 * jordan-vault/fetch-images.ts: YOU launch a normal Chrome with remote debugging
 * and solve the Cloudflare check; this attaches to that already-cleared session.
 *
 *   # 1) launch + solve once (leave the window open):
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     --remote-debugging-port=9222 --user-data-dir="$HOME/.cf-chrome" \
 *     "https://www.tcdb.com/Person.cfm/pid/6734/Kobe-Bryant"
 *
 *   # 2) crawl:
 *   npx tsx kobe-vault/scrape.ts --inspect    # dump one page (debug)
 *   npx tsx kobe-vault/scrape.ts --pages 3    # smoke test (first 3 pages)
 *   npx tsx kobe-vault/scrape.ts              # full catalog (resumable cache)
 *
 * Page layout (confirmed live): Person.cfm lists 50 cards/page; each card row has a
 * /ViewCard.cfm/sid/{sid}/cid/{cid}/… link and a final <td> with the full card name.
 * Pagination is /col/N/PageIndex/{n}/.
 */
import { chromium, type Page } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CardRecord } from "./types";

const HERE = new URL(".", import.meta.url).pathname;
const CACHE_DIR = join(HERE, ".cache");
const DATA_DIR = join(HERE, "data");
const PID = 6734; // Kobe Bryant
const PERSON = (pageIndex: number) =>
  `https://www.tcdb.com/Person.cfm/pid/${PID}/col/N/yea/0/Kobe-Bryant?PageIndex=${pageIndex}&sTeam=&sCardNum=&sNote=&sSetName=&sBrand=`;
const CDP_URL = process.env.CDP_URL ?? "http://localhost:9222";

const args = process.argv.slice(2);
const inspect = args.includes("--inspect");
const pagesArg = args.indexOf("--pages");
const maxPages = pagesArg >= 0 ? Number(args[pagesArg + 1]) : Infinity;
const noCache = args.includes("--no-cache");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();

// Brand family for the vault's manufacturer facet (most-specific prefix first).
const BRANDS: [string, string][] = [
  ["topps chrome", "Topps"], ["topps finest", "Topps"], ["topps gallery", "Topps"], ["finest", "Topps"],
  ["bowman", "Topps"], ["stadium club", "Topps"], ["topps", "Topps"],
  ["sp authentic", "Upper Deck"], ["spx", "Upper Deck"], ["sp ", "Upper Deck"], ["sp-", "Upper Deck"],
  ["exquisite", "Upper Deck"], ["collector's choice", "Upper Deck"], ["ud3", "Upper Deck"], ["ud ", "Upper Deck"],
  ["upper deck", "Upper Deck"],
  ["flair showcase", "Fleer"], ["flair", "Fleer"], ["fleer", "Fleer"], ["ultra", "Fleer"],
  ["metal universe", "Fleer"], ["metal", "Fleer"], ["e-x", "Fleer"], ["ex ", "Fleer"],
  ["skybox", "SkyBox"], ["z-force", "SkyBox"], ["molten metal", "SkyBox"],
  ["nba hoops", "Hoops"], ["hoops", "Hoops"],
  ["pacific", "Pacific"], ["press pass", "Press Pass"], ["score board", "Score Board"], ["scoreboard", "Score Board"],
  ["collector's edge", "Collector's Edge"],
  ["national treasures", "Panini"], ["flawless", "Panini"], ["immaculate", "Panini"], ["spectra", "Panini"],
  ["contenders", "Panini"], ["prizm", "Panini"], ["donruss optic", "Panini"], ["optic", "Panini"],
  ["donruss", "Panini"], ["select", "Panini"], ["mosaic", "Panini"], ["certified", "Panini"],
  ["absolute", "Panini"], ["crown royale", "Panini"], ["revolution", "Panini"], ["chronicles", "Panini"],
  ["panini", "Panini"],
  ["leaf", "Leaf"], ["sage", "SAGE"], ["goodwin", "Upper Deck"], ["sportkings", "Sportkings"],
  ["pinnacle", "Pinnacle"], ["score", "Score"], ["classic", "Classic"],
];
function manufacturerOf(setName: string): string {
  const lower = setName.toLowerCase();
  for (const [k, m] of BRANDS) if (lower.includes(k)) return m;
  return setName.split(/\s+/).slice(0, 2).join(" ") || "Other";
}
// Best-effort type from the card name. Auto/Relic are explicit in the subset and
// reliable; otherwise a card with a "Brand - Subset" structure is an Insert, and a
// plain flagship card (no subset) is Base. (Parallels aren't separated — that can't
// be told reliably from the name alone.)
function cardTypeOf(name: string): string {
  const n = name.toLowerCase();
  if (/\bauto(graph)?s?\b|signature|signing/.test(n)) return "Auto";
  if (/patch|jersey|relic|memorabilia|\bmaterials?\b|button|laundry tag|sneaker|\bshoe\b|\bball\b/.test(n)) return "Relic";
  if (/ - /.test(name)) return "Insert";
  return "Base";
}

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
    // Set name = text after the year (drop the "-97"/"-14" season suffix), before the
    // card number / player.
    const afterYear = (year ? name.slice(name.indexOf(year) + year.length) : name)
      .replace(/^-\d{2}\s*/, "").trim();
    const setName = afterYear.split(/#|Kobe Bryant/)[0].trim() || afterYear;
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
    console.log(`Couldn't attach to Chrome at ${CDP_URL}.\nLaunch a debug Chrome first:\n  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir="$HOME/.cf-chrome" "https://www.tcdb.com/Person.cfm/pid/${PID}/Kobe-Bryant"`);
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
    const html = await getHtml(page, PERSON(1));
    if (!html) { console.log("No HTML (Cloudflare not cleared?). Solve the check + retry."); await close(); return; }
    writeFileSync(join(CACHE_DIR, "inspect-p1.html"), html);
    console.log(`Inspect: ${parseRows(html).length} cards parsed on page 1.`);
    await close();
    return;
  }

  const byId = new Map<number, CardRecord>();
  let empties = 0;
  for (let idx = 1; idx <= maxPages; idx++) {
    const cacheFile = join(CACHE_DIR, `p${idx}.html`);
    let html: string | null = null;
    if (!noCache && existsSync(cacheFile)) html = readFileSync(cacheFile, "utf8");
    if (!html) {
      html = await getHtml(page, PERSON(idx));
      if (!html) { console.log(`\n⚠ page ${idx}: blocked/empty — re-solve Cloudflare in Chrome, then re-run (resumable).`); break; }
      writeFileSync(cacheFile, html);
      await sleep(1000);
    }
    const rows = parseRows(html);
    if (rows.length === 0) { if (++empties >= 2) break; } else empties = 0;
    for (const c of rows) if (!byId.has(c.id)) byId.set(c.id, c);
    process.stdout.write(`\r  page ${idx}: +${rows.length} (unique ${byId.size})`);
  }
  process.stdout.write("\n");

  const all = [...byId.values()];
  writeFileSync(join(DATA_DIR, "cards.json"), JSON.stringify(all, null, 2));
  console.log(`Wrote kobe-vault/data/cards.json — ${all.length} cards.`);
  await close();
}

main().catch((e) => { console.error(e); process.exit(1); });
