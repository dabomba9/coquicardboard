/**
 * Copy self-hosted card images from the LOCAL Supabase Storage to a CLOUD project,
 * preserving the curated/vision-verified set (vs re-running fetch:images on cloud).
 * Matches cards by `slug` (ids differ between instances). Run AFTER seeding the
 * cloud catalog (`npm run seed` pointed at cloud).
 *
 *   CLOUD_SUPABASE_URL=… CLOUD_SERVICE_ROLE_KEY=… npm run tsx admin/migrate-images-to-cloud.ts
 *
 * LOCAL creds come from .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
 *
 * --only-new: copy only what the cloud lacks (a front not yet in card-images, or
 * a back the cloud row doesn't have). Without it every run re-uploads every card.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const LOCAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CLOUD_URL = process.env.CLOUD_SUPABASE_URL!;
const CLOUD_KEY = process.env.CLOUD_SERVICE_ROLE_KEY!;
if (!LOCAL_URL || !LOCAL_KEY || !CLOUD_URL || !CLOUD_KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL+SUPABASE_SERVICE_ROLE_KEY (local) and CLOUD_SUPABASE_URL+CLOUD_SERVICE_ROLE_KEY (cloud).");
  process.exit(1);
}
const local = createClient(LOCAL_URL, LOCAL_KEY, { auth: { persistSession: false } });
const cloud = createClient(CLOUD_URL, CLOUD_KEY, { auth: { persistSession: false } });
const BUCKET = "card-images";
const onlyNew = process.argv.includes("--only-new");

// Supabase caps a single select at 1000 rows — page through with .range() so we
// get ALL cards (the catalogs are 24k+ rows now, not the original <1000).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll<T>(client: { from: (t: string) => any }, build: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(client.from("cards")).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data as T[]) ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function main() {
  // Optional: MIGRATE_CATALOGS=clemente-vault,killebrew-vault limits the copy to
  // specific catalogs (avoids re-uploading catalogs already on cloud).
  const only = (process.env.MIGRATE_CATALOGS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (only.length) console.log(`MIGRATE_CATALOGS: ${only.join(", ")}`);
  type LocalCard = { slug: string; image_url: string | null; image_source: string | null; attributes: Record<string, unknown> | null };
  const localCards = await fetchAll<LocalCard>(
    local, (q) => {
      // Cards with a front OR a back: some cards only have a back scan, and
      // filtering on image_url alone left those backs off production.
      const base = q.select("slug, image_url, image_source, attributes").or("image_url.not.is.null,attributes->>backImage.not.is.null");
      return only.length ? base.in("catalog", only) : base;
    });
  const cloudCards = await fetchAll<{ id: string; slug: string; image_url: string | null; attributes: Record<string, unknown> | null }>(
    cloud, (q) => q.select("id, slug, image_url, attributes"));
  console.log(`local images: ${localCards.length} · cloud cards: ${cloudCards.length}`);
  const cloudIdBySlug = new Map(cloudCards.map((c) => [c.slug, c.id]));
  const cloudAttrsById = new Map(cloudCards.map((c) => [c.id, c.attributes ?? {}]));
  const cloudImageById = new Map(cloudCards.map((c) => [c.id, c.image_url]));

  // Copy one local image URL into the cloud bucket; returns the cloud public URL.
  async function copy(src: string, path: string): Promise<string | null> {
    const res = await fetch(src);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const buf = Buffer.from(await res.arrayBuffer());
    const up = await cloud.storage.from(BUCKET).upload(`${path}.${ext}`, buf, { contentType: ct, upsert: true });
    if (up.error) return null;
    return cloud.storage.from(BUCKET).getPublicUrl(`${path}.${ext}`).data.publicUrl;
  }

  let ok = 0, backs = 0, miss = 0, fail = 0, skipped = 0;
  for (const c of localCards) {
    const cloudId = cloudIdBySlug.get(c.slug);
    if (!cloudId) { miss++; continue; }
    const localBack = c.attributes?.backImage;
    const hasFront = !c.image_url || (cloudImageById.get(cloudId) ?? "").includes(`/${BUCKET}/`); // no local front = nothing to send
    const needBack = typeof localBack === "string" && !!localBack && !cloudAttrsById.get(cloudId)?.backImage;
    if (onlyNew && hasFront && !needBack) { skipped++; continue; }
    try {
      const update: Record<string, unknown> = {};
      if (c.image_url && !(onlyNew && hasFront)) {
        const publicUrl = await copy(c.image_url, `cards/${cloudId}`);
        if (!publicUrl) { fail++; continue; }
        update.image_url = publicUrl;
        update.image_source = c.image_source;
      }
      // Backs live in attributes.backImage (vault cards). They used to be skipped,
      // so production had none. Merge into the CLOUD row's own attributes — never
      // overwrite them with the local copy.
      if (typeof localBack === "string" && localBack && (!onlyNew || needBack)) {
        const backUrl = await copy(localBack, `cards/${cloudId}-back`);
        if (backUrl) { update.attributes = { ...cloudAttrsById.get(cloudId), backImage: backUrl }; backs++; }
      }
      if (Object.keys(update).length === 0) { fail++; continue; } // only a back was due, and it failed
      const { error } = await cloud.from("cards").update(update).eq("id", cloudId);
      if (error) { fail++; continue; }
      ok++;
      if (ok % 25 === 0) console.log(`  …${ok} copied (${backs} backs)`);
    } catch { fail++; }
  }
  console.log(`Done. copied=${ok} backs=${backs} no-slug-match=${miss} failed=${fail}${onlyNew ? ` already-on-cloud=${skipped}` : ""}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
