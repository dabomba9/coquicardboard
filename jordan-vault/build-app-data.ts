/**
 * Generate the app-facing dataset for the /vault section from data/cards.json.
 *
 * Writes ../data/vault.json — a slim, self-contained array the Next app reads
 * server-side (no DB). Image paths are derived deterministically from the id, so
 * this does NOT depend on the image download being finished; a missing file just
 * falls back to CardThumb's placeholder.
 *
 *   npx tsx jordan-vault/build-app-data.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const HERE = new URL(".", import.meta.url).pathname;

type Card = {
  id: number; slug: string | null; name: string | null; year: number | null;
  manufacturer: string | null; brand: string | null; cardNumber: string | null;
  cardType: string | null; tier: number | null; page: number | null; row: number | null;
  frontImage: string | null; backImage: string | null; psaPopReport: string | null;
};

type VaultCard = {
  id: number; slug: string | null; name: string | null; year: number | null;
  manufacturer: string | null; brand: string | null; cardNumber: string | null;
  cardType: string | null; tier: number | null; page: number | null; row: number | null;
  // Image presence only — the actual URL (Supabase Storage) is built at runtime in
  // lib/vault.ts from NEXT_PUBLIC_SUPABASE_URL so it works in any environment.
  hasFront: boolean; hasBack: boolean; psaPopReport: string | null;
};

async function main() {
  const cards: Card[] = JSON.parse(await readFile(join(HERE, "data", "cards.json"), "utf8"));
  const out: VaultCard[] = cards.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    year: c.year,
    manufacturer: c.manufacturer,
    brand: c.brand,
    cardNumber: c.cardNumber,
    cardType: c.cardType,
    tier: c.tier,
    page: c.page,
    row: c.row,
    hasFront: !!c.frontImage,
    hasBack: !!c.backImage,
    psaPopReport: c.psaPopReport,
  }));
  out.sort((a, b) => a.id - b.id);
  await writeFile(join(HERE, "..", "data", "vault.json"), JSON.stringify(out));
  console.log(`Wrote data/vault.json — ${out.length} cards (` +
    `${out.filter((c) => c.hasFront).length} front, ${out.filter((c) => c.hasBack).length} back).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
