import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "card-images";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Downloads an external image and stores it in the public `card-images` bucket
// at cards/<cardId>.<ext>, returning our own public URL (or null on failure).
// `db` must be a service-role client (write access to Storage).
export async function downloadAndStore(
  db: SupabaseClient,
  cardId: string,
  sourceUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return null;
    const rawType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const ext = EXT_BY_TYPE[rawType] ?? "jpg";
    // Normalize: if the source didn't send a known image type, default to jpeg
    // so the stored object serves with a proper image MIME (not octet-stream).
    const contentType = EXT_BY_TYPE[rawType] ? rawType : "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;

    const path = `cards/${cardId}.${ext}`;
    const { error } = await db.storage.from(BUCKET).upload(path, buf, {
      contentType,
      upsert: true,
    });
    if (error) return null;

    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
