/**
 * Fill ESTIMATED values for ONLY the (card, grade) combos that have no price yet.
 * Additive + non-destructive: never upserts over existing rows, so real eBay
 * (and manual) prices are left untouched. source='estimated'.
 *
 *   npm run prices:fill            (local)
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run prices:fill   (cloud)
 *
 * Reverse it any time with: delete from card_prices where source='estimated';
 *                           delete from price_history where source='estimated';
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// Deterministic 0..1 hash from a string (same as seed-prices for consistency).
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

const TIER_BASE: Record<number, number> = { 1: 250_000_00, 2: 25_000_00, 3: 4_000_00, 4: 600_00 };
const GRADE_MULT: Record<string, number> = { raw: 1, PSA9: 3, PSA10: 12, "BGS9.5": 18 };
const MONTHS = 36;

function monthDates(n: number): string[] {
  const out: string[] = [];
  let y = 2026, m = 6; // fixed anchor 2026-06 (reproducible)
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}-01`);
    m--; if (m === 0) { m = 12; y--; }
  }
  return out.reverse();
}

async function main() {
  const { data: cards, error } = await db.from("cards").select("id, tier_id, name");
  if (error) throw error;

  // Existing (card_id, grade_key) pairs — these are off-limits.
  const existing = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error: e } = await db
      .from("card_prices").select("card_id, grade_key").range(from, from + 999);
    if (e) throw e;
    if (!data || data.length === 0) break;
    for (const r of data) existing.add(`${r.card_id}|${r.grade_key}`);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`existing price rows: ${existing.size}`);

  const dates = monthDates(MONTHS);
  const priceRows: Record<string, unknown>[] = [];
  const historyRows: Record<string, unknown>[] = [];
  let filledCards = 0;

  for (const card of cards!) {
    const seed = hash01(card.id);
    const base = Math.round(TIER_BASE[card.tier_id] * (0.6 + seed * 0.9));
    const trend = 0.4 + seed * 0.8;
    const grades = card.tier_id <= 2 ? ["raw", "PSA9", "PSA10", "BGS9.5"] : ["raw", "PSA9", "PSA10"];
    let touched = false;

    for (const g of grades) {
      if (existing.has(`${card.id}|${g}`)) continue; // never overwrite real prices
      touched = true;
      const mult = GRADE_MULT[g];
      let latest = 0;
      dates.forEach((d, i) => {
        const t = i / (MONTHS - 1);
        const wobble = 1 + 0.12 * Math.sin((i + seed * 10) * 1.1) + (hash01(card.id + g + i) - 0.5) * 0.06;
        const v = Math.round(base * mult * (1 - trend / 2 + trend * t) * wobble);
        latest = Math.max(v, 100);
        historyRows.push({ card_id: card.id, grade_key: g, value_cents: latest, recorded_on: d, source: "estimated" });
      });
      priceRows.push({
        card_id: card.id, grade_key: g, median_cents: latest, last_sale_cents: latest,
        currency: "USD", sample_size: 0, source: "estimated", as_of: `${dates[dates.length - 1]}T00:00:00Z`,
      });
    }
    if (touched) filledCards++;
  }

  if (priceRows.length === 0) {
    console.log("Nothing to fill — every card/grade already has a price.");
    return;
  }

  // Insert a batch with retry (cloud sockets can drop on large payloads).
  async function insertBatch(table: string, rows: Record<string, unknown>[]) {
    for (let attempt = 1; ; attempt++) {
      const { error: e } = await db.from(table).insert(rows);
      if (!e) return;
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  // Reset estimated rows first so the run is fully idempotent (never touches ebay/manual).
  await db.from("price_history").delete().eq("source", "estimated");
  await db.from("card_prices").delete().eq("source", "estimated");
  for (let i = 0; i < historyRows.length; i += 500) {
    await insertBatch("price_history", historyRows.slice(i, i + 500));
    process.stdout.write(`\r  history ${Math.min(i + 500, historyRows.length)}/${historyRows.length}`);
  }
  process.stdout.write("\n");
  for (let i = 0; i < priceRows.length; i += 250) {
    await insertBatch("card_prices", priceRows.slice(i, i + 250));
  }
  console.log(`✓ filled ${priceRows.length} missing price rows across ${filledCards} card(s)`);
  console.log(`✓ price_history (estimated): ${historyRows.length}`);
  console.log("Done (source=estimated; real eBay/manual prices untouched).");
}
main().catch((e) => { console.error(e); process.exit(1); });
