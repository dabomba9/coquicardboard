"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountState = { error?: string } | null;

// Permanently delete the signed-in user's account. Deleting the auth user
// cascades their profile / holdings / want_list (all FK'd `on delete cascade`).
// Only ever acts on the current session's user — a user can only delete themselves.
export async function deleteAccount(): Promise<AccountState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/");
}
