/**
 * Reconcile vault card image links with the images that ACTUALLY exist in the
 * `vault-images` Storage bucket. The seed (seed-vault.ts) optimistically derived
 * image_url/backImage from tcdb's hasFront/hasBack flags, but only a fraction of
 * those images have been fetched + uploaded — so most links 404. This script
 * makes the DB truthful: image_url / image_source / attributes.backImage are set
 * only when the corresponding object is present in the bucket, else null.
 *
 * Idempotent. Re-run after uploading more images (upload-images.ts) to "light up"
 * the newly-available ones.
 *
 *   npx tsx admin/reconcile-vault-images.ts
 *
 * Add --cloud to reconcile the cloud DB (uses CLOUD_* env vars if present).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const cloud = process.argv.includes("--cloud");
const url = (cloud && process.env.CLOUD_SUPABASE_URL) || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = (cloud && process.env.CLOUD_SERVICE_ROLE_KEY) || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase URL or service-role key in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const BUCKET = "vault-images";
const STORAGE_BASE = `${url}/storage/v1/object/public/${BUCKET}`;

/** List every object in the bucket and split into front/back id sets. */
async function loadPresentIds(): Promise<{ fronts: Set<number>; backs: Set<number> }> {
  const fronts = new Set<number>();
  const backs = new Set<number>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list("", {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data.length) break;
    for (const obj of data) {
      const m = /^(\d+)-(front|back)\.jpg$/.exec(obj.name);
      if (!m) continue;
      (m[2] === "front" ? fronts : backs).add(Number(m[1]));
    }
    if (data.length < 1000) break;
  }
  return { fronts, backs };
}

type Row = {
  id: string;
  image_url: string | null;
  image_source: string | null;
  attributes: Record<string, unknown> | null;
};

async function main() {
  console.log(`Reconciling vault images against the '${BUCKET}' bucket${cloud ? " (cloud)" : ""}…`);
  const { fronts, backs } = await loadPresentIds();
  console.log(`Bucket has ${fronts.size} front + ${backs.size} back images.`);

  let updated = 0;
  let scanned = 0;
  let withFront = 0;
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("cards")
      .select("id, image_url, image_source, attributes")
      .eq("catalog", "mj-vault")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;

    for (const row of data as Row[]) {
      scanned++;
      const attrs = (row.attributes ?? {}) as Record<string, unknown>;
      const vaultId = Number(attrs.vault_id);
      const hasFront = Number.isFinite(vaultId) && fronts.has(vaultId);
      const hasBack = Number.isFinite(vaultId) && backs.has(vaultId);
      if (hasFront) withFront++;

      const nextImageUrl = hasFront ? `${STORAGE_BASE}/${vaultId}-front.jpg` : null;
      const nextImageSource = hasFront ? "jordan-vault" : null;
      const nextBack = hasBack ? `${STORAGE_BASE}/${vaultId}-back.jpg` : null;
      const prevBack = (attrs.backImage ?? null) as string | null;

      if (row.image_url === nextImageUrl && row.image_source === nextImageSource && prevBack === nextBack) {
        continue; // already correct
      }
      const { error: upErr } = await db
        .from("cards")
        .update({
          image_url: nextImageUrl,
          image_source: nextImageSource,
          attributes: { ...attrs, backImage: nextBack },
        })
        .eq("id", row.id);
      if (upErr) throw upErr;
      updated++;
    }
    process.stdout.write(`\r  scanned ${scanned} · updated ${updated}`);
    if (data.length < PAGE) break;
  }
  process.stdout.write("\n");
  console.log(`Done. ${withFront} cards now have a front image (${updated} rows changed).`);
}

main().catch((e) => { console.error("\nreconcile-vault-images failed:", e); process.exit(1); });
