"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { searchImageCandidates, activeProvider, playerForCatalog } from "@/lib/image-search";
import { downloadAndStore } from "@/lib/image-store";

export type ImageActionState = { error?: string; ok?: boolean; cardId?: string; imageUrl?: string | null } | null;

const urlSchema = z.string().url().refine((u) => u.startsWith("https://"), "Must be an https URL.");

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return null;
  return user;
}

export async function setCardImage(cardId: string, url: string, source?: string): Promise<ImageActionState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };
  const parsed = urlSchema.safeParse(url.trim());
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid URL." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("cards")
    .update({ image_url: parsed.data, image_source: source?.trim() || "admin" })
    .eq("id", cardId);
  if (error) return { error: error.message };

  revalidatePath("/admin/images");
  revalidatePath("/hierarchy");
  return { ok: true, cardId };
}

// Searches the active image provider for a card photo, downloads it into our
// Supabase Storage bucket, and saves our own public URL. Returns that URL.
export async function fetchCardImage(cardId: string): Promise<ImageActionState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const admin = createAdminClient();
  const { data: card, error: cErr } = await admin
    .from("cards").select("name, catalog").eq("id", cardId).single();
  if (cErr || !card) return { error: cErr?.message ?? "Card not found." };

  try {
    const candidates = await searchImageCandidates(card.name, playerForCatalog(card.catalog));
    if (candidates.length === 0) return { error: "No image match found." };

    let stored: string | null = null;
    for (const c of candidates) {
      stored = await downloadAndStore(admin, cardId, c.imageUrl);
      if (stored) break;
    }
    if (!stored) return { error: "Found candidates but none could be downloaded." };

    const { error } = await admin
      .from("cards")
      .update({ image_url: stored, image_source: `${activeProvider()} (cached)` })
      .eq("id", cardId);
    if (error) return { error: error.message };
    revalidatePath("/admin/images");
    revalidatePath("/hierarchy");
    return { ok: true, cardId, imageUrl: stored };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function clearCardImage(cardId: string): Promise<ImageActionState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("cards")
    .update({ image_url: null, image_source: null })
    .eq("id", cardId);
  if (error) return { error: error.message };

  revalidatePath("/admin/images");
  revalidatePath("/hierarchy");
  return { ok: true, cardId };
}
