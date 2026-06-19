/**
 * Bulk-populate card images: search the active provider (IMAGE_SEARCH_PROVIDER,
 * default duckduckgo), DOWNLOAD each image, and store it in our Supabase Storage
 * `card-images` bucket. cards.image_url then points at our own public URL.
 *
 *   npm run fetch:images              # only cards missing an image
 *   npm run fetch:images -- --force   # refetch every card
 *   npm run fetch:images -- --limit 20
 *
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * (eBay provider also needs EBAY_CLIENT_ID / EBAY_CLIENT_SECRET.)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { searchImageCandidates, activeProvider, playerForCatalog } from "../lib/image-search";
import { downloadAndStore } from "../lib/image-store";

config({ path: ".env.local" });

const force = process.argv.includes("--force");
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : undefined;
const catalogArg = process.argv.indexOf("--catalog");
const catalog = catalogArg !== -1 ? process.argv[catalogArg + 1] : undefined;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Image provider: ${activeProvider()}${catalog ? ` · catalog: ${catalog}` : ""}`);
  let q = db.from("cards").select("id, name, image_url, catalog").order("tier_id").order("rarity_rank");
  if (catalog) q = q.eq("catalog", catalog);
  if (!force) q = q.is("image_url", null);
  const { data: cards, error } = await q;
  if (error) throw error;

  const todo = (limit ? cards!.slice(0, limit) : cards!) ?? [];
  console.log(`Fetching images for ${todo.length} card(s)${force ? " (force)" : " (missing only)"}…`);

  let ok = 0, miss = 0, fail = 0;
  for (const card of todo) {
    try {
      const candidates = await searchImageCandidates(card.name, playerForCatalog(card.catalog));
      if (candidates.length === 0) { miss++; console.log(`  – no match: ${card.name}`); }
      else {
        let stored: string | null = null;
        for (const c of candidates) {
          stored = await downloadAndStore(db, card.id, c.imageUrl);
          if (stored) break;
        }
        if (!stored) { fail++; console.log(`  ✗ download failed (${candidates.length} tried): ${card.name}`); }
        else {
          const { error: upErr } = await db
            .from("cards")
            .update({ image_url: stored, image_source: `${activeProvider()} (cached)` })
            .eq("id", card.id);
          if (upErr) throw upErr;
          ok++; console.log(`  ✓ ${card.name}`);
        }
      }
    } catch (e) {
      fail++; console.log(`  ✗ ${card.name}: ${(e as Error).message}`);
    }
    await sleep(500); // be gentle with the (unofficial) endpoint
  }
  console.log(`\nDone. stored=${ok} no-match=${miss} failed=${fail}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
