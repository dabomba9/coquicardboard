/**
 * Seed ESTIMATED market values: card_prices (by grade) + a monthly price_history
 * series (~36 months) per card. Deterministic (hash of card id) so re-runs are
 * stable. source='estimated' — clearly best-effort, NOT real market data.
 *
 *   npm run seed:prices
 *
 * A real feed (Card Ladder / eBay partner) would later replace these rows.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// Deterministic 0..1 hash from a string.
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

// Base raw value (cents) by tier — grails worth more.
const TIER_BASE: Record<number, number> = { 1: 250_000_00, 2: 25_000_00, 3: 4_000_00, 4: 600_00 };
// Graded multipliers over raw.
const GRADE_MULT: Record<string, number> = { raw: 1, PSA9: 3, PSA10: 12, "BGS9.5": 18 };
const MONTHS = 36;

function monthDates(n: number): string[] {
  // Last n month-starts, oldest first. Fixed anchor (no Date.now for reproducibility).
  const out: string[] = [];
  let y = 2026, m = 6; // anchor: 2026-06
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}-01`);
    m--; if (m === 0) { m = 12; y--; }
  }
  return out.reverse();
}

async function main() {
  const { data: cards, error } = await db.from("cards").select("id, tier_id, name");
  if (error) throw error;

  const dates = monthDates(MONTHS);
  const priceRows: Record<string, unknown>[] = [];
  const historyRows: Record<string, unknown>[] = [];

  for (const card of cards!) {
    const seed = hash01(card.id);
    const base = Math.round(TIER_BASE[card.tier_id] * (0.6 + seed * 0.9)); // vary ±
    // Smooth upward-ish trend with per-card direction + mild wobble.
    const trend = 0.4 + seed * 0.8;            // total growth factor over window
    const grades = card.tier_id <= 2 ? ["raw", "PSA9", "PSA10", "BGS9.5"] : ["raw", "PSA9", "PSA10"];

    for (const g of grades) {
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
  }

  // Clear old estimated history, then insert fresh (idempotent-ish).
  await db.from("price_history").delete().eq("source", "estimated");
  for (let i = 0; i < historyRows.length; i += 1000) {
    const { error: e } = await db.from("price_history").insert(historyRows.slice(i, i + 1000));
    if (e) throw e;
  }
  for (let i = 0; i < priceRows.length; i += 500) {
    const { error: e } = await db.from("card_prices").upsert(priceRows.slice(i, i + 500), { onConflict: "card_id,grade_key" });
    if (e) throw e;
  }
  console.log(`✓ card_prices: ${priceRows.length}`);
  console.log(`✓ price_history: ${historyRows.length} (${MONTHS} months × grades)`);
  console.log("Seed prices complete (source=estimated).");
}
main().catch((e) => { console.error(e); process.exit(1); });
