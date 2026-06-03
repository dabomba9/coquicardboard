/**
 * Pull current eBay ASKING-price medians into card_prices (+ a today price_history
 * point). NOT sold comps — active listings only; labeled source='ebay (asking)'.
 *
 *   npm run prices:ebay                 # all cards
 *   npm run prices:ebay -- --limit 10   # first 10 (test)
 *   npm run prices:ebay -- --tier 1     # only tier 1
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EBAY_CLIENT_ID,
 * EBAY_CLIENT_SECRET in .env.local.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { searchEbayListings, ebayConfigured } from "../lib/ebay";
import { buildQuery } from "../lib/image-search";
import { priceFromListings } from "../lib/ebay-match";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error("Missing Supabase env in .env.local"); process.exit(1); }
if (!ebayConfigured()) { console.error("Missing EBAY_CLIENT_ID / EBAY_CLIENT_SECRET in .env.local (see README)."); process.exit(1); }

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : undefined;
const tierArg = process.argv.indexOf("--tier");
const tier = tierArg !== -1 ? parseInt(process.argv[tierArg + 1], 10) : undefined;

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const today = new Date().toISOString().slice(0, 10);

// grade_key → query suffix. Add high-end grades only for top tiers.
const GRADES = (t: number): { key: string; suffix: string }[] => [
  { key: "raw", suffix: "" },
  { key: "PSA10", suffix: "PSA 10" },
  { key: "PSA9", suffix: "PSA 9" },
  ...(t <= 2 ? [{ key: "BGS9.5", suffix: "BGS 9.5" }] : []),
];

async function main() {
  let q = db.from("cards").select("id, name, tier_id").order("tier_id").order("rarity_rank");
  if (tier) q = q.eq("tier_id", tier);
  const { data: cards, error } = await q;
  if (error) throw error;
  const todo = (limit ? cards!.slice(0, limit) : cards!) ?? [];
  console.log(`eBay asking-price refresh for ${todo.length} card(s)…`);

  let priced = 0, grades = 0, skipped = 0;
  for (const card of todo) {
    const base = buildQuery(card.name);
    let any = false;
    for (const g of GRADES(card.tier_id)) {
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
        }
      } catch (e) {
        console.log(`  ! ${card.name} [${g.key}]: ${(e as Error).message}`);
      }
      await sleep(300);
    }
    if (any) { priced++; console.log(`  ✓ ${card.name}`); }
    else { skipped++; console.log(`  – no listings: ${card.name}`); }
  }
  console.log(`\nDone. cards priced=${priced} grade-rows=${grades} skipped=${skipped}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
