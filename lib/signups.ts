// Pure helpers for the admin sign-ups page (no Supabase imports, so they're testable).

export type SignupRow = {
  id: string;
  email: string | null;
  createdAt: string; // ISO
  lastSignInAt: string | null;
  confirmed: boolean;
  username: string | null;
  displayName: string | null;
  isPublic: boolean;
  cardsTracked: number; // distinct cards in holdings
  wants: number;
};

const DAY = 86_400_000;

/** Newest first, plus how many joined in the last 7 and 30 days. */
export function summarizeSignups(rows: SignupRow[], now: Date = new Date()) {
  const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const within = (days: number) => sorted.filter((r) => now.getTime() - new Date(r.createdAt).getTime() <= days * DAY).length;
  return { rows: sorted, total: sorted.length, last7: within(7), last30: within(30) };
}
