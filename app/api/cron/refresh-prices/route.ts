import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ebayConfigured, searchEbayListings, searchEbaySoldItems, EbayInsightsNoAccessError } from "@/lib/ebay";
import { buildQuery, playerForCatalog } from "@/lib/image-search";
import { priceFromListings } from "@/lib/ebay-match";

export const maxDuration = 60; // Vercel: needs Pro for >10s; tune BATCH for Hobby.

const BATCH = Number(process.env.PRICE_REFRESH_BATCH ?? 10);
const grades = (tier: number) => [
  { key: "raw", suffix: "" },
  { key: "PSA10", suffix: "PSA 10" },
  { key: "PSA9", suffix: "PSA 9" },
  ...(tier <= 2 ? [{ key: "BGS9.5", suffix: "BGS 9.5" }] : []),
];

// Nightly: refresh the stalest-priced cards' eBay asking medians (rotates through
// the catalog). Secured by CRON_SECRET (Vercel sends it as a Bearer token).
export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!ebayConfigured()) return NextResponse.json({ error: "ebay not configured" }, { status: 200 });

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const seen = new Set<string>();
  const targets: { id: string; name: string; tier: number; catalog: string; isNew: boolean }[] = [];

  // Half the batch goes to NEW coverage — cards with no price row yet (newest
  // first, which surfaces the 12k Jordan Vault cards) — so they enter the
  // rotation over time. Tier is null for vault → price as a common (no BGS).
  const NEW = Math.ceil(BATCH / 2);
  const { data: unpriced } = await admin
    .from("cards")
    .select("id, name, tier_id, catalog, card_prices!left(card_id)")
    .is("card_prices", null)
    .order("created_at", { ascending: false })
    .limit(NEW);
  for (const c of (unpriced as { id: string; name: string; tier_id: number | null; catalog: string }[]) ?? []) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    targets.push({ id: c.id, name: c.name, tier: c.tier_id ?? 4, catalog: c.catalog, isNew: true });
  }

  // Fill the rest with the stalest-priced distinct cards (rotating refresh).
  const { data: rows } = await admin
    .from("card_prices")
    .select("card_id, as_of, cards(name, tier_id, catalog)")
    .order("as_of", { ascending: true })
    .limit(BATCH * 6);
  type CardRel = { name: string; tier_id: number | null; catalog: string };
  type Row = { card_id: string; cards: CardRel[] | CardRel | null };
  for (const r of (rows as Row[]) ?? []) {
    if (targets.length >= BATCH) break;
    const cardObj = Array.isArray(r.cards) ? r.cards[0] : r.cards;
    if (seen.has(r.card_id) || !cardObj) continue;
    seen.add(r.card_id);
    targets.push({ id: r.card_id, name: cardObj.name, tier: cardObj.tier_id ?? 4, catalog: cardObj.catalog, isNew: false });
  }

  let updated = 0, soldRows = 0;
  let soldAccessible = true; // flips off after the first no-access, to stop retrying
  for (const card of targets) {
    const base = buildQuery(card.name, playerForCatalog(card.catalog));
    let wroteReal = false;
    for (const g of grades(card.tier)) {
      const query = g.suffix ? `${base} ${g.suffix}` : base;
      try {
        // Prefer REAL sold comps (Marketplace Insights); fall back to asking listings.
        let median: number | null = null, count = 0, source = "ebay (asking)", histSource = "ebay";
        if (soldAccessible) {
          try {
            const sold = await searchEbaySoldItems(query);
            const r = priceFromListings(sold, card.name, g.key, 2);
            if (r) { median = r.medianCents; count = r.count; source = "ebay (sold)"; histSource = "ebay-sold"; }
          } catch (e) {
            if (e instanceof EbayInsightsNoAccessError) soldAccessible = false;
            else throw e;
          }
        }
        if (median === null) {
          const r = priceFromListings(await searchEbayListings(query), card.name, g.key, 3);
          if (!r) continue;
          median = r.medianCents; count = r.count;
        }
        await admin.from("card_prices").upsert(
          { card_id: card.id, grade_key: g.key, median_cents: median, last_sale_cents: median,
            currency: "USD", sample_size: count, source, as_of: new Date().toISOString() },
          { onConflict: "card_id,grade_key" }
        );
        await admin.from("price_history").delete()
          .match({ card_id: card.id, grade_key: g.key, recorded_on: today, source: histSource });
        await admin.from("price_history").insert(
          { card_id: card.id, grade_key: g.key, value_cents: median, recorded_on: today, source: histSource }
        );
        updated++;
        wroteReal = true;
        if (source === "ebay (sold)") soldRows++;
      } catch { /* skip grade on error */ }
    }
    // No real comp this run. Advance the rotation without ever nulling a real price:
    //  • new card (no rows yet) → insert a sentinel raw row (null median, source
    //    'none') so it leaves the "unpriced" pool; null medians never display a value
    //    (real-only) and it's revisited later when a comp may have appeared.
    //  • already-priced card → just bump as_of (last-checked) so it rotates to the
    //    back of the stale queue, preserving its existing medians.
    if (!wroteReal) {
      const now = new Date().toISOString();
      if (card.isNew) {
        await admin.from("card_prices").insert(
          { card_id: card.id, grade_key: "raw", median_cents: null, last_sale_cents: null,
            currency: "USD", sample_size: 0, source: "none", as_of: now }
        );
      } else {
        await admin.from("card_prices").update({ as_of: now }).eq("card_id", card.id);
      }
    }
  }
  // Mark cached catalog/price reads stale (stale-while-revalidate) so fresh prices
  // surface without waiting out the revalidate window. "max" is the recommended profile.
  if (updated > 0) { revalidateTag("prices", "max"); revalidateTag("vault-catalog", "max"); }
  return NextResponse.json({ refreshed: targets.length, gradeRows: updated, soldRows });
}
