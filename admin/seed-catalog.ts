/**
 * Seeds the shared catalog (tiers, sets, cards) using the
 * Supabase service-role key, which bypasses RLS. Idempotent: re-running upserts.
 *
 *   npm run seed
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   (server secret — never expose to the browser)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { TIERS, cardSlug, type SeedCard } from "../data/catalog";
import { loadChecklist } from "../data/checklist";
import { loadKobeChecklist } from "../data/kobe-checklist";

config({ path: ".env.local" });

// Which catalog to seed: `mj-hierarchy` (default) or `kobe-hierarchy`.
//   npm run seed         → MJ
//   npm run seed:kobe    → Kobe (Mamba Origins)
const CATALOG = process.argv[2] ?? process.env.SEED_CATALOG ?? "mj-hierarchy";
const isKobe = CATALOG === "kobe-hierarchy";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  console.log(`Seeding catalog: ${CATALOG}`);
  const cards = isKobe ? loadKobeChecklist() : loadChecklist();

  // 1. Tiers ---------------------------------------------------------------
  // Kobe groups by brand, not by the 4 rarity tiers; its derived tier_id is purely
  // cosmetic. Skip the tiers upsert in Kobe mode so it never clobbers MJ's tier
  // `card_count` denormalization (the tiers rows already exist from the MJ seed).
  if (!isKobe) {
    const tierRows = TIERS.map((t) => ({
      id: t.id, name: t.name, slug: t.slug, rank: t.rank,
      description: t.description, card_count: cards.filter((c) => c.tier_id === t.id).length,
    }));
    const { error } = await db.from("tiers").upsert(tierRows, { onConflict: "id" });
    if (error) throw error;
    console.log(`✓ tiers: ${tierRows.length}`);
  }

  // 2. Sets (unique by name) ----------------------------------------------
  const setByName = new Map<string, { name: string; year: number; manufacturer: string; slug: string }>();
  for (const c of cards) {
    if (!setByName.has(c.setName)) {
      setByName.set(c.setName, {
        name: c.setName, year: c.year, manufacturer: c.manufacturer, slug: slugify(c.setName),
      });
    }
  }
  const setRows = [...setByName.values()];
  {
    const { error } = await db.from("sets").upsert(setRows, { onConflict: "slug" });
    if (error) throw error;
  }
  const { data: setData, error: setErr } = await db.from("sets").select("id, slug");
  if (setErr) throw setErr;
  const setIdBySlug = new Map(setData!.map((s) => [s.slug, s.id]));
  console.log(`✓ sets: ${setRows.length}`);

  // 3. Cards ---------------------------------------------------------------
  const cardRows = cards.map((c: SeedCard, i: number) => ({
    catalog: CATALOG,
    tier_id: c.tier_id,
    set_id: setIdBySlug.get(slugify(c.setName)) ?? null,
    name: c.name,
    card_number: c.card_number ?? null,
    year: c.year,
    is_rookie: c.is_rookie ?? false,
    is_insert: c.is_insert ?? false,
    is_parallel: c.is_parallel ?? false,
    print_run: c.print_run ?? null,
    serial_numbered: c.serial_numbered ?? false,
    pack_odds: c.pack_odds ?? null,
    catalog_value_cents: c.catalog_value_cents ?? null,
    rarity_rank: i,
    attributes: { ...(c.attributes ?? {}), placeholder: c.is_placeholder ?? false },
    image_url: c.image_url ?? null,
    image_source: c.image_source ?? null,
    slug: cardSlug(c, i, isKobe ? "kobe" : ""),
  }));
  {
    // chunk to keep payloads reasonable
    for (let i = 0; i < cardRows.length; i += 200) {
      const { error } = await db.from("cards").upsert(cardRows.slice(i, i + 200), { onConflict: "slug" });
      if (error) throw error;
    }
    console.log(`✓ cards: ${cardRows.length}`);
  }

  // Prices come ONLY from real eBay data (admin/fetch-ebay-*.ts + the nightly cron) —
  // the catalog seed never writes fabricated prices.

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
