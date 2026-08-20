/**
 * Seed a vault catalog (no tier) into the shared `cards` table so the cards reuse
 * the holdings / want_list / card_prices / detail machinery. Idempotent: upserts
 * on slug. Run AFTER migration 0006.
 *
 *   npx tsx admin/seed-vault.ts mj-vault                       # Jordan (data/vault.json)
 *   npx tsx admin/seed-vault.ts kobe-vault data/kobe-vault.json kv
 *   (args: <catalog> [inputFile] [slugPrefix])
 *
 * Reads the app dataset JSON. Image links are populated separately by
 * admin/reconcile-vault-images.ts (from what's actually uploaded to the
 * vault-images bucket), not here, so the seed never creates broken 404 links.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

const CATALOG = process.argv[2] ?? "mj-vault";
const INPUT = process.argv[3] ?? (CATALOG === "mj-vault" ? "data/vault.json" : `data/${CATALOG}.json`);
// Slug prefix keeps vaults from colliding with each other / the hierarchy (MJ='v', Kobe='kv').
const SLUG_PREFIX = process.argv[4] ?? (CATALOG === "mj-vault" ? "v" : "kv");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

type RawVaultCard = {
  id: number; slug: string | null; name: string | null; year: number | null;
  manufacturer: string | null; brand: string | null; cardNumber: string | null;
  cardType: string | null; tier: number | null; page: number | null; row: number | null;
  hasFront: boolean; hasBack: boolean; psaPopReport: string | null;
};

async function main() {
  const cards: RawVaultCard[] = JSON.parse(
    readFileSync(join(process.cwd(), INPUT), "utf8")
  );
  console.log(`Seeding ${cards.length} vault cards into cards (catalog='${CATALOG}', from ${INPUT})…`);

  // Images are never derived from the JSON (see the note below), so on a re-seed a
  // plain upsert would null out every link reconcile/migrate had populated. Carry
  // the stored image_url/image_source/backImage forward instead.
  const { data: existing, error: exErr } = await db
    .from("cards").select("slug, image_url, image_source, attributes").eq("catalog", CATALOG);
  if (exErr) throw exErr;
  const prevBySlug = new Map((existing ?? []).map((r) => [r.slug, r]));
  let preserved = 0;

  const rows = cards.map((c, i) => {
  const slug = `${SLUG_PREFIX}${c.id}-${c.slug ?? "card"}`;
  const prev = prevBySlug.get(slug);
  const prevAttrs = (prev?.attributes ?? {}) as Record<string, unknown>;
  if (prev?.image_url) preserved++;
  return {
    // Vault catalog, no tier; slug prefixed so it never collides with other
    // catalogs (MJ vault 'v', Kobe vault 'kv', hierarchies are unprefixed/'kobe').
    catalog: CATALOG,
    tier_id: null,
    set_id: null,
    name: c.name ?? `Vault card ${c.id}`,
    card_number: c.cardNumber ?? null,
    year: c.year ?? null,
    rarity_rank: i,
    catalog_value_cents: null,
    // Image links are never derived from the JSON: tcdb's hasFront/hasBack only
    // mean the image *existed upstream*, not that we've fetched + uploaded it. A
    // first seed leaves them null (avoids broken 404 links); run upload-images.ts
    // then admin/reconcile-vault-images.ts to populate them from the bucket. On a
    // RE-seed we keep whatever is already stored rather than clearing it.
    image_url: prev?.image_url ?? null,
    image_source: prev?.image_source ?? null,
    attributes: {
      manufacturer: c.manufacturer ?? null,
      brand: c.brand ?? null,
      cardType: c.cardType ?? null,
      page: c.page ?? null,
      row: c.row ?? null,
      backImage: prevAttrs.backImage ?? null,
      psaPopReport: c.psaPopReport ?? null,
      vault_id: c.id,
    },
    slug,
  };
  });

  let done = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await db.from("cards").upsert(chunk, { onConflict: "slug" });
    if (error) throw error;
    done += chunk.length;
    process.stdout.write(`\r  ${done}/${rows.length}`);
  }
  process.stdout.write("\n");
  console.log(`Vault seed complete.${preserved ? ` Kept ${preserved} existing image link${preserved === 1 ? "" : "s"}.` : ""}`);
}

main().catch((e) => { console.error("\nseed-vault failed:", e); process.exit(1); });
