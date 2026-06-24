/**
 * Copy self-hosted card images from the LOCAL Supabase Storage to a CLOUD project,
 * preserving the curated/vision-verified set (vs re-running fetch:images on cloud).
 * Matches cards by `slug` (ids differ between instances). Run AFTER seeding the
 * cloud catalog (`npm run seed` pointed at cloud).
 *
 *   CLOUD_SUPABASE_URL=… CLOUD_SERVICE_ROLE_KEY=… npm run tsx admin/migrate-images-to-cloud.ts
 *
 * LOCAL creds come from .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
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
  const localCards = await fetchAll<{ slug: string; image_url: string; image_source: string | null }>(
    local, (q) => q.select("slug, image_url, image_source").not("image_url", "is", null));
  const cloudCards = await fetchAll<{ id: string; slug: string }>(cloud, (q) => q.select("id, slug"));
  console.log(`local images: ${localCards.length} · cloud cards: ${cloudCards.length}`);
  const cloudIdBySlug = new Map(cloudCards.map((c) => [c.slug, c.id]));

  let ok = 0, miss = 0, fail = 0;
  for (const c of (localCards as { slug: string; image_url: string; image_source: string | null }[]) ?? []) {
    const cloudId = cloudIdBySlug.get(c.slug);
    if (!cloudId) { miss++; continue; }
    try {
      const res = await fetch(c.image_url);
      if (!res.ok) { fail++; continue; }
      const ct = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const buf = Buffer.from(await res.arrayBuffer());
      const path = `cards/${cloudId}.${ext}`;
      const up = await cloud.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
      if (up.error) { fail++; continue; }
      const publicUrl = cloud.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      await cloud.from("cards").update({ image_url: publicUrl, image_source: c.image_source }).eq("id", cloudId);
      ok++;
      if (ok % 25 === 0) console.log(`  …${ok} copied`);
    } catch { fail++; }
  }
  console.log(`Done. copied=${ok} no-slug-match=${miss} failed=${fail}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
