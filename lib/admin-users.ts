import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SignupRow } from "@/lib/signups";

// Every account with its profile and collection activity, for /admin/users.
// Service-role read: only call this after isAdmin() has passed.
export async function getSignups(): Promise<SignupRow[]> {
  const db = createAdminClient();

  const users: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null; email_confirmed_at?: string | null }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const [{ data: profiles }, holdings, wants] = await Promise.all([
    db.from("profiles").select("id, username, display_name, is_public"),
    pageAll<{ user_id: string; card_id: string }>((from) => db.from("holdings").select("user_id, card_id").range(from, from + 999)),
    pageAll<{ user_id: string }>((from) => db.from("want_list").select("user_id").range(from, from + 999)),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p as { username: string | null; display_name: string | null; is_public: boolean }]));
  const cardsByUser = new Map<string, Set<string>>();
  for (const h of holdings) (cardsByUser.get(h.user_id) ?? cardsByUser.set(h.user_id, new Set()).get(h.user_id)!).add(h.card_id);
  const wantsByUser = new Map<string, number>();
  for (const w of wants) wantsByUser.set(w.user_id, (wantsByUser.get(w.user_id) ?? 0) + 1);

  return users.map((u) => {
    const p = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      confirmed: !!u.email_confirmed_at,
      username: p?.username ?? null,
      displayName: p?.display_name ?? null,
      isPublic: !!p?.is_public,
      cardsTracked: cardsByUser.get(u.id)?.size ?? 0,
      wants: wantsByUser.get(u.id) ?? 0,
    };
  });
}

// Supabase caps a select at 1000 rows; page through.
async function pageAll<T>(query: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from);
    if (error) throw new Error(error.message);
    const rows = (data as T[]) ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
