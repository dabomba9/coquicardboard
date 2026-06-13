/**
 * Seed the 12k Jordan Vault cards into the shared `cards` table (catalog='vault',
 * no tier) so they reuse the holdings / want_list / card_prices / detail
 * machinery. Idempotent: upserts on slug. Run AFTER migration 0006.
 *
 *   npx tsx admin/seed-vault.ts
 *
 * Reads data/vault.json (the generated app dataset). Image links are populated
 * separately by admin/reconcile-vault-images.ts (from what's actually uploaded to
 * the vault-images bucket), not here, so the seed never creates broken 404 links.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

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
    readFileSync(join(process.cwd(), "data/vault.json"), "utf8")
  );
  console.log(`Seeding ${cards.length} vault cards into cards (catalog='vault')…`);

  const rows = cards.map((c, i) => ({
    // catalog='vault', no tier; slug prefixed with the vault id so it never
    // collides with the 378 hierarchy slugs.
    catalog: "mj-vault",
    tier_id: null,
    set_id: null,
    name: c.name ?? `Vault card ${c.id}`,
    card_number: c.cardNumber ?? null,
    year: c.year ?? null,
    rarity_rank: i,
    catalog_value_cents: null,
    // Image links are intentionally left null at seed time: tcdb's hasFront/hasBack
    // only mean the image *existed upstream*, not that we've fetched + uploaded it.
    // Run upload-images.ts then admin/reconcile-vault-images.ts to populate these
    // from what's actually in the vault-images bucket (avoids broken 404 links).
    image_url: null,
    image_source: null,
    attributes: {
      manufacturer: c.manufacturer ?? null,
      brand: c.brand ?? null,
      cardType: c.cardType ?? null,
      page: c.page ?? null,
      row: c.row ?? null,
      backImage: null,
      psaPopReport: c.psaPopReport ?? null,
      vault_id: c.id,
    },
    slug: `v${c.id}-${c.slug ?? "card"}`,
  }));

  let done = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await db.from("cards").upsert(chunk, { onConflict: "slug" });
    if (error) throw error;
    done += chunk.length;
    process.stdout.write(`\r  ${done}/${rows.length}`);
  }
  process.stdout.write("\n");
  console.log("Vault seed complete.");
}

main().catch((e) => { console.error("\nseed-vault failed:", e); process.exit(1); });
