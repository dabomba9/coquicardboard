"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean } | null;

const holdingSchema = z
  .object({
    card_id: z.string().uuid(),
    condition_type: z.enum(["raw", "graded"]),
    grading_company: z.enum(["PSA", "BGS", "SGC"]).nullable().optional(),
    grade: z.coerce.number().min(1).max(10).nullable().optional(),
    quantity: z.coerce.number().int().min(1).max(999).default(1),
    purchase_price: z.coerce.number().min(0).nullable().optional(), // dollars
    acquired_at: z.string().nullable().optional(),
    for_trade: z.coerce.boolean().default(false),
    is_public: z.coerce.boolean().default(true),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine(
    (v) => v.condition_type === "raw" || (v.grading_company && v.grade != null),
    { message: "Graded copies need a grading company and grade." }
  );

function toRow(v: z.infer<typeof holdingSchema>) {
  const graded = v.condition_type === "graded";
  return {
    card_id: v.card_id,
    condition_type: v.condition_type,
    grading_company: graded ? v.grading_company ?? null : null,
    grade: graded ? v.grade ?? null : null,
    quantity: v.quantity,
    purchase_price_cents: v.purchase_price != null ? Math.round(v.purchase_price * 100) : null,
    acquired_at: v.acquired_at || null,
    for_trade: v.for_trade,
    is_public: v.is_public,
    notes: v.notes || null,
  };
}

function revalidateCard(slug: string) {
  revalidatePath(`/collection/${slug}`);
  revalidatePath("/collection");
  revalidatePath("/hierarchy");
}

export async function addHolding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const parsed = holdingSchema.safeParse(rawFrom(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await supabase.from("holdings").insert({ ...toRow(parsed.data), user_id: user.id });
  if (error) return { error: error.message };

  revalidateCard(String(formData.get("card_slug") ?? ""));
  return { ok: true };
}

export async function updateHolding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const holdingId = String(formData.get("holding_id") ?? "");
  const parsed = holdingSchema.safeParse(rawFrom(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await supabase.from("holdings").update(toRow(parsed.data)).eq("id", holdingId);
  if (error) return { error: error.message };

  revalidateCard(String(formData.get("card_slug") ?? ""));
  return { ok: true };
}

function rawFrom(formData: FormData) {
  return {
    card_id: formData.get("card_id"),
    condition_type: formData.get("condition_type"),
    grading_company: formData.get("grading_company") || null,
    grade: formData.get("grade") || null,
    quantity: formData.get("quantity") || 1,
    purchase_price: formData.get("purchase_price") || null,
    acquired_at: formData.get("acquired_at") || null,
    for_trade: formData.get("for_trade") === "on",
    is_public: formData.get("is_public") !== "off",
    notes: formData.get("notes") || null,
  };
}

export async function deleteHolding(holdingId: string, cardSlug: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("holdings").delete().eq("id", holdingId);
  if (error) return;
  revalidateCard(cardSlug);
}

// Quick-add a plain raw copy of a card from the grid (no form). Idempotent-ish:
// if the user already owns ≥1 copy, it's a no-op success.
export async function quickAddOwned(cardId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: existing } = await supabase
    .from("holdings").select("id").eq("card_id", cardId).limit(1);
  if (!existing || existing.length === 0) {
    const { error } = await supabase
      .from("holdings")
      .insert({ user_id: user.id, card_id: cardId, condition_type: "raw", quantity: 1 });
    if (error) return { error: error.message };
  }
  revalidatePath("/hierarchy");
  revalidatePath("/collection");
  return { ok: true };
}

// ---- Want list ----

export async function addToWantList(cardId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("want_list").upsert({ user_id: user.id, card_id: cardId }, { onConflict: "user_id,card_id" });
  revalidatePath("/want-list");
  revalidatePath("/hierarchy");
}

export async function removeFromWantList(cardId: string) {
  const supabase = await createClient();
  await supabase.from("want_list").delete().eq("card_id", cardId);
  revalidatePath("/want-list");
}
