/**
 * Pull REAL eBay SOLD-comp medians (last ~90 days) into card_prices (+ a today
 * price_history point). Uses the Marketplace Insights API — requires the app to be
 * approved for it (apply at developer.ebay.com). Labeled source='ebay (sold)', which
 * takes precedence over 'ebay (asking)' and 'estimated' (one row per card+grade).
 *
 *   npm run prices:sold                 # all cards
 *   npm run prices:sold -- --limit 10   # first 10 (test)
 *   npm run prices:sold -- --tier 1     # only tier 1
 *
 * Target cloud by prefixing the cloud URL + service key inline (see DEPLOY.md).
 * Until access is granted, exits cleanly with an "apply for access" message.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { searchEbaySoldItems, ebayConfigured, EbayInsightsNoAccessError } from "../lib/ebay";
import { buildQuery, playerForCatalog } from "../lib/image-search";
import { priceFromListings } from "../lib/ebay-match";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error("Missing Supabase env in .env.local"); process.exit(1); }
if (!ebayConfigured()) { console.error("Missing EBAY_CLIENT_ID / EBAY_CLIENT_SECRET in .env.local."); process.exit(1); }

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : undefined;
const tierArg = process.argv.indexOf("--tier");
const tier = tierArg !== -1 ? parseInt(process.argv[tierArg + 1], 10) : undefined;
const catalogArg = process.argv.indexOf("--catalog");
const catalog = catalogArg !== -1 ? process.argv[catalogArg + 1] : undefined;

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const today = new Date().toISOString().slice(0, 10);

// Sold comps are scarcer than active listings → require fewer samples.
const MIN_SOLD_SAMPLES = 2;

const GRADES = (t: number): { key: string; suffix: string }[] => [
  { key: "raw", suffix: "" },
  { key: "PSA10", suffix: "PSA 10" },
  { key: "PSA9", suffix: "PSA 9" },
  ...(t <= 2 ? [{ key: "BGS9.5", suffix: "BGS 9.5" }] : []),
];

async function main() {
  let q = db.from("cards").select("id, name, tier_id, catalog").order("tier_id").order("rarity_rank");
  if (catalog) q = q.eq("catalog", catalog);
  if (tier) q = q.eq("tier_id", tier);
  const { data: cards, error } = await q;
  if (error) throw error;
  const todo = (limit ? cards!.slice(0, limit) : cards!) ?? [];
  console.log(`eBay SOLD-comp refresh for ${todo.length} card(s)${catalog ? ` · catalog: ${catalog}` : ""}…`);

  let priced = 0, grades = 0, skipped = 0;
  for (const card of todo) {
    const base = buildQuery(card.name, playerForCatalog(card.catalog));
    let any = false;
    for (const g of GRADES(card.tier_id)) {
      try {
        const query = g.suffix ? `${base} ${g.suffix}` : base;
        const sold = await searchEbaySoldItems(query);
        const result = priceFromListings(sold, card.name, g.key, MIN_SOLD_SAMPLES);
        if (result) {
          const { medianCents, count } = result;
          await db.from("card_prices").upsert(
            { card_id: card.id, grade_key: g.key, median_cents: medianCents, last_sale_cents: medianCents,
              currency: "USD", sample_size: count, source: "ebay (sold)", as_of: new Date().toISOString() },
            { onConflict: "card_id,grade_key" }
          );
          await db.from("price_history").delete()
            .match({ card_id: card.id, grade_key: g.key, recorded_on: today, source: "ebay-sold" });
          await db.from("price_history").insert(
            { card_id: card.id, grade_key: g.key, value_cents: medianCents, recorded_on: today, source: "ebay-sold" }
          );
          grades++; any = true;
        }
      } catch (e) {
        if (e instanceof EbayInsightsNoAccessError) {
          console.log(`\n${e.message}\n(No data written. Re-run once eBay approves Marketplace Insights.)`);
          process.exit(0);
        }
        console.log(`  ! ${card.name} [${g.key}]: ${(e as Error).message}`);
      }
      await sleep(300);
    }
    if (any) { priced++; console.log(`  ✓ ${card.name}`); }
    else { skipped++; console.log(`  – no sold comps: ${card.name}`); }
  }
  console.log(`\nDone. cards priced=${priced} grade-rows=${grades} skipped=${skipped} (source=ebay sold)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
