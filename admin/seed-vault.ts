/**
 * Seed the 12k Jordan Vault cards into the shared `cards` table (catalog='vault',
 * no tier) so they reuse the holdings / want_list / card_prices / detail
 * machinery. Idempotent: upserts on slug. Run AFTER migration 0006.
 *
 *   npx tsx admin/seed-vault.ts
 *
 * Reads data/vault.json (the generated app dataset) and builds image_url from the
 * vault-images Storage bucket via NEXT_PUBLIC_SUPABASE_URL.
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
const STORAGE_BASE = `${url}/storage/v1/object/public/vault-images`;

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
    image_url: c.hasFront ? `${STORAGE_BASE}/${c.id}-front.jpg` : null,
    image_source: c.hasFront ? "jordan-vault" : null,
    attributes: {
      manufacturer: c.manufacturer ?? null,
      brand: c.brand ?? null,
      cardType: c.cardType ?? null,
      page: c.page ?? null,
      row: c.row ?? null,
      backImage: c.hasBack ? `${STORAGE_BASE}/${c.id}-back.jpg` : null,
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
