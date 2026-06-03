/**
 * Print candidate image URLs for a card name (uses the same pipeline as fetch).
 *   npx tsx admin/print-candidates.ts "1996 Upper Deck Smooth Grooves #SG8"
 * Used by the vision-verification flow to re-pick a correct front.
 */
import { config } from "dotenv";
import { searchImageCandidates } from "../lib/image-search";

config({ path: ".env.local" });

async function main() {
  const name = process.argv.slice(2).join(" ");
  if (!name) { console.error("usage: print-candidates.ts <card name>"); process.exit(1); }
  const cands = await searchImageCandidates(name);
  cands.forEach((c, i) => console.log(`${i}\t${c.imageUrl}\t${c.title.slice(0, 80)}`));
}
main().catch((e) => { console.error(e); process.exit(1); });
