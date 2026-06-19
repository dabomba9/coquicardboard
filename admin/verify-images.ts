/**
 * Vision-verification helper, step 1 of 2 (see admin/apply-image-decisions.ts).
 * Downloads every CURRENT card image for a catalog to a local dir and writes a
 * manifest the auditor (a multimodal model) reads to judge each image against the
 * card's expected identity (player, brand, base number, parallel/finish).
 *
 *   npx tsx admin/verify-images.ts --catalog kobe-hierarchy [--out /tmp/kobe-verify]
 *
 * Output:
 *   <out>/cur/<slug>.<ext>     the downloaded current image
 *   <out>/manifest.json        [{ id, slug, name, brand, baseNumber, type, serial, imagePath }]
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

config({ path: ".env.local" });

const arg = (flag: string, def?: string) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : def;
};
const catalog = arg("--catalog", "kobe-hierarchy")!;
const outDir = arg("--out", "/tmp/kobe-verify")!;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const extFromType = (ct: string) =>
  ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("gif") ? "gif" : "jpg";

async function main() {
  const curDir = path.join(outDir, "cur");
  mkdirSync(curDir, { recursive: true });

  const { data: cards, error } = await db
    .from("cards")
    .select("id, slug, name, card_number, attributes, image_url")
    .eq("catalog", catalog)
    .not("image_url", "is", null)
    .order("rarity_rank");
  if (error) throw error;

  const manifest: Record<string, unknown>[] = [];
  let ok = 0, fail = 0;
  for (const c of cards ?? []) {
    const attrs = (c.attributes ?? {}) as Record<string, unknown>;
    let imagePath: string | null = null;
    try {
      const res = await fetch(c.image_url as string);
      if (res.ok) {
        const ct = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
        const ext = extFromType(ct);
        const buf = Buffer.from(await res.arrayBuffer());
        imagePath = path.join(curDir, `${c.slug}.${ext}`);
        writeFileSync(imagePath, buf);
        ok++;
      } else fail++;
    } catch { fail++; }
    manifest.push({
      id: c.id,
      slug: c.slug,
      name: c.name,
      brand: attrs.brand ?? null,
      baseNumber: c.card_number ?? null,
      type: attrs.type ?? null,
      serial: attrs.serial ?? null,
      imagePath,
    });
  }

  const manifestPath = path.join(outDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Downloaded ${ok} image(s), ${fail} failed.`);
  console.log(`Manifest: ${manifestPath} (${manifest.length} cards)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
