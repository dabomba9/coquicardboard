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
 *   npx tsx admin/reconcile-vault-images.ts                       # Jordan vault
 *   npx tsx admin/reconcile-vault-images.ts kobe-vault tcdb       # Kobe vault
 *   (args: [catalog=mj-vault] [imageSource=jordan-vault])
 *
 * LOCAL ONLY in practice: this maps `vault-images/{vault_id}-front.jpg`, which is
 * how images are stored locally. The CLOUD project keeps every image in
 * `card-images/{card_uuid}.jpg` (put there by admin/migrate-images-to-cloud.ts)
 * and its `vault-images` bucket is empty — so a --cloud run would find nothing
 * and clear every vault link. The guard below refuses that; see admin/safety.ts.
 *
 * Add --cloud to reconcile the cloud DB (requires CLOUD_SUPABASE_URL +
 * CLOUD_SERVICE_ROLE_KEY; it will not fall back to local). --force overrides the
 * safety verdict.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { resolveTarget, reconcileVerdict } from "./safety";

config({ path: ".env.local" });

const cloud = process.argv.includes("--cloud");
const force = process.argv.includes("--force");
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const CATALOG = positional[0] ?? "mj-vault";
const IMAGE_SOURCE = positional[1] ?? "jordan-vault";
let url: string, serviceKey: string, host: string;
try {
  ({ url, serviceKey, host } = resolveTarget({ cloud }));
} catch (e) {
  console.error((e as Error).message);
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
  console.log(`Reconciling ${CATALOG} images against the '${BUCKET}' bucket — target: ${host}${cloud ? " (CLOUD)" : " (local)"}`);
  const { fronts, backs } = await loadPresentIds();
  console.log(`Bucket has ${fronts.size} front + ${backs.size} back images.`);

  // Pass 1 — plan only. This script derives image_url purely from the bucket, so
  // a missing/incomplete bucket silently NULLS links rather than adding them.
  // Work out the full change set (and how much of it is destructive) before
  // touching a single row.
  type Plan = { id: string; image_url: string | null; image_source: string | null; attributes: Record<string, unknown> };
  const plans: Plan[] = [];
  let scanned = 0, withFront = 0, linkedNow = 0, wouldClear = 0;
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("cards")
      .select("id, image_url, image_source, attributes")
      .eq("catalog", CATALOG)
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
      if (row.image_url) linkedNow++;

      const nextImageUrl = hasFront ? `${STORAGE_BASE}/${vaultId}-front.jpg` : null;
      const nextImageSource = hasFront ? IMAGE_SOURCE : null;
      const nextBack = hasBack ? `${STORAGE_BASE}/${vaultId}-back.jpg` : null;
      const prevBack = (attrs.backImage ?? null) as string | null;

      if (row.image_url === nextImageUrl && row.image_source === nextImageSource && prevBack === nextBack) {
        continue; // already correct
      }
      if (row.image_url && !nextImageUrl) wouldClear++;
      plans.push({ id: row.id, image_url: nextImageUrl, image_source: nextImageSource, attributes: { ...attrs, backImage: nextBack } });
    }
    process.stdout.write(`\r  scanned ${scanned} · planned ${plans.length}`);
    if (data.length < PAGE) break;
  }
  process.stdout.write("\n");
  console.log(`  plan → ${plans.length} rows change · ${withFront} would have a front image · ${wouldClear} existing links would be CLEARED (of ${linkedNow} linked now)`);

  const verdict = reconcileVerdict({ presentFronts: fronts.size, linkedNow, wouldClear });
  if (!verdict.ok) {
    if (!force) {
      console.error(`\nRefusing to apply: ${verdict.reason}`);
      console.error("Nothing was changed. Re-run with --force only if you are certain.");
      process.exit(1);
    }
    console.log(`\n! Proceeding despite: ${verdict.reason} (--force)`);
  }

  // Pass 2 — apply.
  let updated = 0;
  for (const p of plans) {
    const { error: upErr } = await db
      .from("cards")
      .update({ image_url: p.image_url, image_source: p.image_source, attributes: p.attributes })
      .eq("id", p.id);
    if (upErr) throw upErr;
    updated++;
    if (updated % 200 === 0) process.stdout.write(`\r  updated ${updated}/${plans.length}`);
  }
  process.stdout.write("\n");
  console.log(`Done. ${withFront} cards now have a front image (${updated} rows changed).`);
}

main().catch((e) => { console.error("\nreconcile-vault-images failed:", e); process.exit(1); });
