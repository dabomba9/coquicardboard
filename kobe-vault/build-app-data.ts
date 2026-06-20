/**
 * Generate the app-facing dataset for /kobe-vault from kobe-vault/data/cards.json.
 * Writes ../data/kobe-vault.json — the slim array admin/seed-vault.ts reads.
 * No images (TCDB images are not stored/redistributed), so hasFront/hasBack=false.
 *
 *   npx tsx kobe-vault/build-app-data.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CardRecord } from "./types";

const HERE = new URL(".", import.meta.url).pathname;

type VaultCard = {
  id: number; slug: string | null; name: string | null; year: number | null;
  manufacturer: string | null; brand: string | null; cardNumber: string | null;
  cardType: string | null; tier: number | null; page: number | null; row: number | null;
  hasFront: boolean; hasBack: boolean; psaPopReport: string | null;
};

async function main() {
  const cards: CardRecord[] = JSON.parse(await readFile(join(HERE, "data", "cards.json"), "utf8"));
  const out: VaultCard[] = cards.map((c) => ({
    id: c.id, slug: c.slug, name: c.name, year: c.year,
    manufacturer: c.manufacturer, brand: c.brand, cardNumber: c.cardNumber,
    cardType: c.cardType, tier: null, page: null, row: null,
    hasFront: false, hasBack: false, psaPopReport: null,
  }));
  out.sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || (a.name ?? "").localeCompare(b.name ?? ""));
  await writeFile(join(HERE, "..", "data", "kobe-vault.json"), JSON.stringify(out));
  console.log(`Wrote data/kobe-vault.json — ${out.length} cards (${new Set(out.map((c) => c.manufacturer)).size} manufacturers, years ${Math.min(...out.map((c) => c.year ?? 9999))}–${Math.max(...out.map((c) => c.year ?? 0))}).`);
}
main().catch((e) => { console.error(e); process.exit(1); });
