"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; ok?: boolean } | null;

const schema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/, "3–30 letters, numbers, or underscores."),
  display_name: z.string().max(60).nullable().optional(),
  bio: z.string().max(300).nullable().optional(),
  is_public: z.boolean().default(false),
});

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const parsed = schema.safeParse({
    username: String(formData.get("username") ?? ""),
    display_name: (formData.get("display_name") as string) || null,
    bio: (formData.get("bio") as string) || null,
    is_public: formData.get("is_public") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { error: "That username is taken." };
    return { error: error.message };
  }
  revalidatePath("/settings");
  return { ok: true };
}
