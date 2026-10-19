/**
 * Pull current eBay ASKING-price medians into card_prices (+ a today price_history
 * point). NOT sold comps — active listings only; labeled source='ebay (asking)'.
 *
 *   npm run prices:ebay                        # all cards
 *   npm run prices:ebay -- --limit 10          # first 10 (test)
 *   npm run prices:ebay -- --tier 1            # only tier 1
 *   npm run prices:ebay -- --catalog mj-vault  # one catalog
 *   npm run prices:ebay -- --missing-only      # only grades not already answered
 *   npm run prices:ebay -- --grades raw        # only these grade keys (comma list): 1 call/card
 *   npm run prices:ebay -- --no-image-first    # imageless cards first (a price makes them indexable)
 *   npm run prices:ebay -- --missing-only --retry-none  # also re-ask "checked, no listings" grades
 *
 * eBay's default Browse quota is 5,000 calls/day and each card costs 3 calls
 * (4 for tier 1-2), so a catalog sweep is ~3.5 calls per card — budget before a
 * big run, and use --missing-only to resume one without re-spending it.
 *
 * Requires EBAY_CLIENT_ID / EBAY_CLIENT_SECRET plus Supabase creds in .env.local.
 * Add --cloud to target the cloud DB (requires CLOUD_SUPABASE_URL +
 * CLOUD_SERVICE_ROLE_KEY; it will not fall back to local).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { searchEbayListings, ebayConfigured } from "../lib/ebay";
import { buildQuery, playerForCatalog } from "../lib/image-search";
import { priceFromListings } from "../lib/ebay-match";
import { resolveTarget } from "./safety";

config({ path: ".env.local" });

const cloud = process.argv.includes("--cloud");
let url: string, serviceKey: string, host: string, isLocal: boolean;
try {
  ({ url, serviceKey, host, isLocal } = resolveTarget({ cloud }));
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
if (!ebayConfigured()) { console.error("Missing EBAY_CLIENT_ID / EBAY_CLIENT_SECRET in .env.local (see README)."); process.exit(1); }

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : undefined;
const tierArg = process.argv.indexOf("--tier");
const tier = tierArg !== -1 ? parseInt(process.argv[tierArg + 1], 10) : undefined;
const catalogArg = process.argv.indexOf("--catalog");
const catalog = catalogArg !== -1 ? process.argv[catalogArg + 1] : undefined;
// Skip (card, grade) pairs already in card_prices — including the 'none' sentinels,
// which mean "checked, no comps". Makes a long run resumable and stops it burning
// eBay quota re-asking questions we already have answers to.
const missingOnly = process.argv.includes("--missing-only");
// Restrict to these grade keys, e.g. `--grades raw` for the big vaults: one call per
// card, and tier-less vault cards rarely have enough PSA 9/10 listings to price.
const gradesArg = process.argv.indexOf("--grades");
const onlyGrades = gradesArg !== -1 ? new Set(process.argv[gradesArg + 1].split(",").map((g) => g.trim())) : null;
// Cards with no image first: for those, a price is what makes the page indexable.
const noImageFirst = process.argv.includes("--no-image-first");
// With --missing-only: re-ask grades whose only answer is a 'none' sentinel (e.g.
// after a matcher fix). A real price is never re-asked; a hit replaces the sentinel.
const retryNone = process.argv.includes("--retry-none");

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const today = new Date().toISOString().slice(0, 10);

// grade_key → query suffix. Add high-end grades only for top tiers.
// `t != null` matters: vault cards have tier_id null and `null <= 2` is TRUE in JS,
// so every tier-less common used to get the BGS 9.5 query meant for grails —
// a wasted quarter of the quota on a grade that almost never has listings.
const GRADES = (t: number | null): { key: string; suffix: string }[] => [
  { key: "raw", suffix: "" },
  { key: "PSA10", suffix: "PSA 10" },
  { key: "PSA9", suffix: "PSA 9" },
  ...(t != null && t <= 2 ? [{ key: "BGS9.5", suffix: "BGS 9.5" }] : []),
].filter((g) => !onlyGrades || onlyGrades.has(g.key));

async function main() {
  // Page through: one select is capped at 1000 rows, which silently limited a
  // 12k-card vault to its first thousand.
  type Row = { id: string; name: string; tier_id: number | null; catalog: string; image_url: string | null; attributes: Record<string, unknown> | null };
  const cards: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from("cards").select("id, name, tier_id, catalog, image_url, attributes").order("tier_id").order("rarity_rank").order("id");
    if (catalog) q = q.eq("catalog", catalog);
    if (tier) q = q.eq("tier_id", tier);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    cards.push(...((data as Row[]) ?? []));
    if (!data || data.length < 1000) break;
  }
  // Imageless first; within each group, unlicensed oddballs (posters, promos —
  // rarely listed) last. Stable sort keeps tier/rarity order otherwise.
  const oddball = (c: Row) => Number(c.attributes?.manufacturer === "Misc & Unlicensed");
  if (noImageFirst) cards.sort((a, b) => Number(!!a.image_url) - Number(!!b.image_url) || oddball(a) - oddball(b));

  // Grades we already have an answer for (a price OR a 'none' sentinel).
  const known = new Set<string>();
  if (missingOnly) {
    const ids = cards.map((c) => c.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error: kErr } = await db
        .from("card_prices").select("card_id, grade_key, source").in("card_id", ids.slice(i, i + 200));
      if (kErr) throw kErr;
      for (const r of (data as { card_id: string; grade_key: string; source: string | null }[]) ?? []) {
        if (retryNone && r.source === "none") continue;
        known.add(`${r.card_id}|${r.grade_key}`);
      }
    }
    console.log(`  skipping ${known.size} grade(s) already ${retryNone ? "priced" : "checked"}`);
  }
  // --limit counts cards that still have work. Applied before the --missing-only
  // filter, a daily `--limit 2000` re-selected the same, already-answered cards.
  const pending = missingOnly ? cards.filter((c) => GRADES(c.tier_id).some((g) => !known.has(`${c.id}|${g.key}`))) : cards;
  const todo = limit ? pending.slice(0, limit) : pending;
  console.log(`eBay asking-price refresh — target: ${host}${isLocal ? " (local)" : " (REMOTE)"}`);
  console.log(`  ${todo.length} card(s)${catalog ? ` · catalog: ${catalog}` : ""}${missingOnly ? ` · missing grades only (${pending.length} pending of ${cards.length})` : ""}${onlyGrades ? ` · grades: ${[...onlyGrades].join(",")}` : ""}${noImageFirst ? " · imageless first" : ""}`);

  let priced = 0, grades = 0, skipped = 0, reused = 0;
  for (const card of todo) {
    const base = buildQuery(card.name, playerForCatalog(card.catalog));
    let any = false;
    let attempted = 0;
    for (const g of GRADES(card.tier_id)) {
      if (missingOnly && known.has(`${card.id}|${g.key}`)) { reused++; continue; }
      attempted++;
      try {
        const query = g.suffix ? `${base} ${g.suffix}` : base;
        const listings = await searchEbayListings(query);
        const result = priceFromListings(listings, card.name, g.key, 3);
        if (result) {
          const { medianCents, count } = result;
          await db.from("card_prices").upsert(
            { card_id: card.id, grade_key: g.key, median_cents: medianCents, last_sale_cents: medianCents,
              currency: "USD", sample_size: count, source: "ebay (asking)", as_of: new Date().toISOString() },
            { onConflict: "card_id,grade_key" }
          );
          // Idempotent for same-day re-runs: replace today's eBay point.
          await db.from("price_history").delete()
            .match({ card_id: card.id, grade_key: g.key, recorded_on: today, source: "ebay" });
          await db.from("price_history").insert(
            { card_id: card.id, grade_key: g.key, value_cents: medianCents, recorded_on: today, source: "ebay" }
          );
          grades++; any = true;
        } else {
          // Record the miss for THIS grade, so --missing-only converges. Without a
          // per-grade record the script asked eBay and threw the answer away: the
          // card stayed "never attempted" and every later run re-bought the same
          // negative result. `none`/null-median rows never display a value (see
          // lib/prices.ts) and the nightly cron still revisits them by as_of.
          const { error: sErr } = await db.from("card_prices").insert(
            { card_id: card.id, grade_key: g.key, median_cents: null, last_sale_cents: null,
              currency: "USD", sample_size: 0, source: "none", as_of: new Date().toISOString() }
          );
          // 23505 = a row for this grade already exists (an earlier sentinel, or a real
          // price we must not overwrite with a miss) — expected on a full re-run.
          if (sErr && sErr.code !== "23505") console.log(`  ! ${card.name} [${g.key} sentinel]: ${sErr.message}`);
          else known.add(`${card.id}|${g.key}`);
        }
      } catch (e) {
        console.log(`  ! ${card.name} [${g.key}]: ${(e as Error).message}`);
      }
      await sleep(300);
    }
    if (attempted === 0) continue; // every grade already answered; nothing asked, nothing to report
    if (any) { priced++; console.log(`  ✓ ${card.name}`); }
    else { skipped++; console.log(`  – no listings: ${card.name}`); }
  }
  console.log(`\nDone. cards priced=${priced} grade-rows=${grades} no-comps=${skipped}${missingOnly ? ` reused=${reused}` : ""}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
