/**
 * Bulk-populate card images: search the active provider (IMAGE_SEARCH_PROVIDER,
 * default duckduckgo), DOWNLOAD each image, and store it in our Supabase Storage
 * `card-images` bucket. cards.image_url then points at our own public URL.
 *
 *   npm run fetch:images              # only cards missing an image
 *   npm run fetch:images -- --force   # refetch every card
 *   npm run fetch:images -- --limit 20
 *   npm run fetch:images -- --only-ids ids.json   # just these card ids (JSON array)
 *
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * (eBay provider also needs EBAY_CLIENT_ID / EBAY_CLIENT_SECRET.)
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { searchImageCandidates, activeProvider, playerForCatalog } from "../lib/image-search";
import { downloadAndStore } from "../lib/image-store";
import { titleMatchesCard } from "../lib/ebay-match";

config({ path: ".env.local" });

const force = process.argv.includes("--force");
const includeVerified = process.argv.includes("--include-verified");
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : undefined;
const catalogArg = process.argv.indexOf("--catalog");
const catalog = catalogArg !== -1 ? process.argv[catalogArg + 1] : undefined;
// Restrict to specific cards (e.g. the Jordan Vault cards TCDB has no scan for).
const idsArg = process.argv.indexOf("--only-ids");
const onlyIds = idsArg !== -1 ? new Set<string>(JSON.parse(readFileSync(process.argv[idsArg + 1], "utf8"))) : null;

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
  // Page through: one select is capped at 1000 rows, which silently limited a run
  // to the first thousand imageless cards.
  type Row = { id: string; name: string; image_url: string | null; image_source: string | null; catalog: string };
  const cards: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from("cards").select("id, name, image_url, image_source, catalog").order("tier_id").order("rarity_rank").order("id");
    if (catalog) q = q.eq("catalog", catalog);
    if (!force) q = q.is("image_url", null);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    cards.push(...((data as Row[]) ?? []).filter((c) => !onlyIds || onlyIds.has(c.id)));
    if (!data || data.length < 1000) break;
  }

  // --force refetches rows that already have an image, which would replace the
  // hand/vision-audited picks (image_source "verified (vision)" / "verified
  // (manual)") with a fresh search guess. Those are the expensive ones to
  // recreate, so skip them unless explicitly included.
  let candidates = cards ?? [];
  let skippedVerified = 0;
  if (force && !includeVerified) {
    const before = candidates.length;
    candidates = candidates.filter((c) => !(c.image_source ?? "").includes("verified"));
    skippedVerified = before - candidates.length;
  }

  const todo = limit ? candidates.slice(0, limit) : candidates;
  console.log(`Fetching images for ${todo.length} card(s)${force ? " (force)" : " (missing only)"}…`);
  if (skippedVerified) console.log(`  (skipping ${skippedVerified} vision/manually-verified image(s); pass --include-verified to overwrite them)`);

  let ok = 0, miss = 0, fail = 0;
  for (const card of todo) {
    try {
      // Only candidates whose title is this exact card. Taking the first hit stored
      // the wrong card for oddball issues (a "Team Issue" search returns Topps base).
      const candidates = (await searchImageCandidates(card.name, playerForCatalog(card.catalog)))
        .filter((c) => titleMatchesCard(c.title, card.name));
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
