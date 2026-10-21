/**
 * Publish a legend vault's TCDB scans (from fetch-images.ts --to-dir) to the cards.
 *
 *   npx tsx legends-vault/publish-images.ts --player clemente --dry-run --cloud
 *   npx tsx legends-vault/publish-images.ts --player clemente --cloud
 *
 * For every card whose vault_id has <id>-front.jpg / <id>-back.jpg in
 * legends-vault/.cache/images/<player>, uploads to `card-images/cards/<cardId>.jpg`
 * (and `-back.jpg`) and sets image_url / image_source='tcdb' / attributes.backImage.
 * A TCDB scan is that exact card, so it REPLACES an eBay-search photo. Never uses
 * the shared `vault-images` bucket, whose numeric names collide with Jordan Vault ids.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveTarget } from "../admin/safety";
import { getPlayer } from "./config";

config({ path: ".env.local", quiet: true });

const argv = process.argv.slice(2);
const player = getPlayer(argv);
const dryRun = argv.includes("--dry-run");
const { url, serviceKey, host } = resolveTarget({ cloud: argv.includes("--cloud") });
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const DIR = join(new URL(".", import.meta.url).pathname, ".cache", "images", player.key);
const BUCKET = "card-images";

type Row = { id: string; name: string; image_url: string | null; image_source: string | null; attributes: Record<string, unknown> | null };

async function upload(file: string, path: string): Promise<string> {
  const { error } = await db.storage.from(BUCKET).upload(path, readFileSync(file), { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function main() {
  const { data, error } = await db.from("cards").select("id, name, image_url, image_source, attributes").eq("catalog", player.catalog);
  if (error) throw error;
  const rows = (data as Row[]) ?? [];
  const tally = { newFront: 0, replacedEbay: 0, refreshedTcdb: 0, backs: 0, noScan: 0 };
  console.log(`${player.name} → ${host}${dryRun ? " (dry run)" : ""}: ${rows.length} cards, scans from ${DIR}`);

  for (const r of rows) {
    const vid = r.attributes?.vault_id;
    const front = join(DIR, `${vid}-front.jpg`);
    const back = join(DIR, `${vid}-back.jpg`);
    const hasFront = existsSync(front), hasBack = existsSync(back);
    if (!hasFront && !hasBack) { tally.noScan++; continue; }

    if (hasFront) {
      if (!r.image_url) tally.newFront++;
      else if (r.image_source !== "tcdb") { tally.replacedEbay++; console.log(`  replace ${r.image_source} → tcdb: ${r.name}`); }
      else tally.refreshedTcdb++;
    }
    if (hasBack) tally.backs++;
    if (dryRun) continue;

    const update: Record<string, unknown> = {};
    if (hasFront) { update.image_url = await upload(front, `cards/${r.id}.jpg`); update.image_source = "tcdb"; }
    if (hasBack) update.attributes = { ...(r.attributes ?? {}), backImage: await upload(back, `cards/${r.id}-back.jpg`) };
    const { error: uErr } = await db.from("cards").update(update).eq("id", r.id);
    if (uErr) console.log(`  ! ${r.name}: ${uErr.message}`);
  }
  console.log(`Done. new fronts ${tally.newFront} · eBay photos replaced ${tally.replacedEbay} · TCDB refreshed ${tally.refreshedTcdb} · backs ${tally.backs} · no TCDB scan ${tally.noScan}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
