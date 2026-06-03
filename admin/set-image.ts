/**
 * Download an image URL into the card-images bucket and point a card at it.
 *   npx tsx admin/set-image.ts <cardId> <imageUrl>
 * Used by the vision-verification sweep to replace a back/wrong image with a
 * verified front. Prints "OK <publicUrl>" or "FAIL <reason>".
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { downloadAndStore } from "../lib/image-store";

config({ path: ".env.local" });

async function main() {
  const [cardId, url] = process.argv.slice(2);
  if (!cardId || !url) { console.error("usage: set-image.ts <cardId> <imageUrl>"); process.exit(1); }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const stored = await downloadAndStore(db, cardId, url);
  if (!stored) { console.log("FAIL could-not-download"); process.exit(2); }

  const { error } = await db
    .from("cards")
    .update({ image_url: stored, image_source: "duckduckgo (cached, vision-verified front)" })
    .eq("id", cardId);
  if (error) { console.log("FAIL " + error.message); process.exit(3); }

  console.log("OK " + stored);
}
main().catch((e) => { console.log("FAIL " + (e as Error).message); process.exit(1); });
