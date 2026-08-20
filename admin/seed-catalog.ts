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
import { loadMambaHierarchy } from "../data/mamba-hierarchy";

config({ path: ".env.local" });

// Which catalog to seed.
//   npm run seed         → MJ hierarchy
//   npm run seed:kobe    → Kobe rookies (Mamba Origins)
//   npm run seed:mamba   → Mamba Hierarchy (curated, career-spanning, 3 tiers)
const CATALOG = process.argv[2] ?? process.env.SEED_CATALOG ?? "mj-hierarchy";
const isKobe = CATALOG === "kobe-hierarchy";
const isMamba = CATALOG === "mamba-hierarchy";
const slugPrefix = isMamba ? "mamba" : isKobe ? "kobe" : "";

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
  const cards = isMamba ? loadMambaHierarchy() : isKobe ? loadKobeChecklist() : loadChecklist();

  // 1. Tiers ---------------------------------------------------------------
  // Only the MJ hierarchy owns the global `tiers` table (ids 1-4). Kobe groups by
  // brand (cosmetic tier_id); the Mamba Hierarchy supplies its own 3-tier metadata
  // on its page. Skip the tiers upsert for both so neither clobbers MJ's rows.
  if (!isKobe && !isMamba) {
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
    // `sets.slug` isn't catalog-scoped, so the 1996 sets are SHARED — Kobe's "1996
    // Topps Chrome" is MJ's row. Kobe/Mamba derive `manufacturer` from the checklist's
    // brand column ("Topps Chrome"), which would overwrite MJ's correct "Topps". Same
    // rule as the tiers guard above: only the MJ hierarchy owns the shared tables, so
    // the others insert brands that are missing and leave existing rows alone.
    const insertOnly = isKobe || isMamba;
    const { error } = await db.from("sets").upsert(setRows, { onConflict: "slug", ignoreDuplicates: insertOnly });
    if (error) throw error;
  }
  const { data: setData, error: setErr } = await db.from("sets").select("id, slug");
  if (setErr) throw setErr;
  const setIdBySlug = new Map(setData!.map((s) => [s.slug, s.id]));
  console.log(`✓ sets: ${setRows.length}`);

  // 3. Cards ---------------------------------------------------------------
  // The checklist carries no images, so a plain upsert would write image_url=null
  // over every link the image pipeline built — re-seeding to pick up a checklist
  // change used to wipe the whole catalog's images. Carry the stored values
  // forward so the seed is idempotent for images, as the docs claim.
  const { data: existing, error: exErr } = await db
    .from("cards").select("slug, image_url, image_source").eq("catalog", CATALOG);
  if (exErr) throw exErr;
  const imageBySlug = new Map((existing ?? []).map((r) => [r.slug, r]));
  let preserved = 0;

  const cardRows = cards.map((c: SeedCard, i: number) => {
    const slug = cardSlug(c, i, slugPrefix);
    const prev = imageBySlug.get(slug);
    const image_url = c.image_url ?? prev?.image_url ?? null;
    const image_source = c.image_source ?? prev?.image_source ?? null;
    if (!c.image_url && prev?.image_url) preserved++;
    return {
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
      image_url,
      image_source,
      slug,
    };
  });
  {
    // chunk to keep payloads reasonable
    for (let i = 0; i < cardRows.length; i += 200) {
      const { error } = await db.from("cards").upsert(cardRows.slice(i, i + 200), { onConflict: "slug" });
      if (error) throw error;
    }
    console.log(`✓ cards: ${cardRows.length}${preserved ? ` (kept ${preserved} existing image link${preserved === 1 ? "" : "s"})` : ""}`);
  }

  // Prices come ONLY from real eBay data (admin/fetch-ebay-*.ts + the nightly cron) —
  // the catalog seed never writes fabricated prices.

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
