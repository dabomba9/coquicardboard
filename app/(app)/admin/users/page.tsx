import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getSignups } from "@/lib/admin-users";
import { summarizeSignups } from "@/lib/signups";
import { AdminNav } from "@/components/admin-nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users · Admin", robots: { index: false, follow: false } };

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) notFound();

  const { rows, total, last7, last30 } = summarizeSignups(await getSignups());

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav current="/admin/users" />
      <h1 className="font-display text-lg uppercase tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted">
        {total} account{total === 1 ? "" : "s"} · {last7} new in the last 7 days · {last30} in the last 30
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left font-sans text-[10px] uppercase tracking-wide text-muted">
            <tr className="border-b border-border/50">
              <th className="py-2 pr-3">Joined</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Username</th>
              <th className="py-2 pr-3">Profile</th>
              <th className="py-2 pr-3 text-right">Cards</th>
              <th className="py-2 pr-3 text-right">Wants</th>
              <th className="py-2 pr-3">Last sign-in</th>
              <th className="py-2">Email confirmed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/30">
                <td className="py-2 pr-3 whitespace-nowrap">{when(r.createdAt)}</td>
                <td className="py-2 pr-3">{r.email ?? "—"}</td>
                <td className="py-2 pr-3">
                  {r.username
                    ? r.isPublic
                      ? <Link href={`/u/${r.username}`} className="text-accent hover:underline">@{r.username}</Link>
                      : `@${r.username}`
                    : "—"}
                  {r.displayName && <span className="ml-1.5 text-muted">{r.displayName}</span>}
                </td>
                <td className="py-2 pr-3">{r.isPublic ? "Public" : "Private"}</td>
                <td className="py-2 pr-3 text-right font-data">{r.cardsTracked}</td>
                <td className="py-2 pr-3 text-right font-data">{r.wants}</td>
                <td className="py-2 pr-3 whitespace-nowrap text-muted">{when(r.lastSignInAt)}</td>
                <td className="py-2">{r.confirmed ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total === 0 && <p className="py-6 text-sm text-muted">No accounts yet.</p>}
      </div>
    </div>
  );
}
