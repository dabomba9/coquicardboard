/**
 * Sync the locally-downloaded Jordan Vault images (public/vault/*.jpg) into the
 * Supabase `vault-images` Storage bucket, which is what the /vault pages serve in
 * every environment. Idempotent + resumable (skips objects already in the bucket).
 *
 *   npx tsx jordan-vault/upload-images.ts            # → local Supabase (.env.local)
 *   npx tsx jordan-vault/upload-images.ts --cloud    # → CLOUD_SUPABASE_URL / CLOUD_SERVICE_ROLE_KEY
 *   npx tsx jordan-vault/upload-images.ts --force     # re-upload even if present
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

config({ path: ".env.local" });

const HERE = new URL(".", import.meta.url).pathname;
const DIR = join(HERE, "..", "public", "vault");
const BUCKET = "vault-images";

const args = process.argv.slice(2);
const cloud = args.includes("--cloud");
const force = args.includes("--force");

const url = cloud ? process.env.CLOUD_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = cloud ? process.env.CLOUD_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(cloud
    ? "Missing CLOUD_SUPABASE_URL / CLOUD_SERVICE_ROLE_KEY."
    : "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/** All object names already in the bucket (paginated). */
async function listExisting(): Promise<Set<string>> {
  const seen = new Set<string>();
  if (force) return seen;
  let offset = 0;
  for (;;) {
    const { data, error } = await db.storage.from(BUCKET).list("", { limit: 1000, offset });
    if (error) { console.error("list failed:", error.message); break; }
    if (!data || data.length === 0) break;
    for (const o of data) seen.add(o.name);
    if (data.length < 1000) break;
    offset += data.length;
  }
  return seen;
}

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".jpg"));
  if (files.length === 0) { console.log("No images in public/vault/."); return; }
  console.log(`Local images: ${files.length}. Target: ${cloud ? "CLOUD" : url}`);

  const existing = await listExisting();
  const todo = files.filter((f) => !existing.has(f));
  console.log(`${existing.size} already in bucket → uploading ${todo.length}.`);
  if (todo.length === 0) { console.log("Nothing to upload."); return; }

  let ok = 0, fail = 0, done = 0;
  const CONCURRENCY = 8;
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const name = todo[next++];
      try {
        const buf = await readFile(join(DIR, name));
        const { error } = await db.storage.from(BUCKET).upload(name, buf, {
          contentType: "image/jpeg",
          upsert: true,
        });
        if (error) throw error;
        ok++;
      } catch {
        fail++;
      }
      if (++done % 200 === 0 || done === todo.length) process.stdout.write(`\r  ${done}/${todo.length} (ok ${ok}, fail ${fail})`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  process.stdout.write("\n");
  console.log(`Done. uploaded ${ok}, failed ${fail}. Bucket now holds ~${existing.size + ok} objects.`);
}

main().catch((e) => { console.error("\nupload-images failed:", e); process.exit(1); });
