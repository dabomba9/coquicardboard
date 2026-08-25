import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicCollection } from "@/lib/queries";
import { Badge, Panel } from "@/components/ui/primitives";
import { cn, gradeLabel, TIER_COLORS } from "@/lib/utils";

export const dynamic = "force-dynamic";

// This was the only public route with no metadata at all, so a shared profile link
// unfurled with the generic site title and had no canonical. The RPC returns null
// for profiles that aren't public, so anything reaching here is genuinely shareable.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicCollection(username);
  if (!data) return {};

  const name = data.profile?.display_name || data.profile?.username || username;
  const hierarchyOwned = data.tiers.reduce((s, t) => s + t.owned_cards, 0);
  const total = data.tiers.reduce((s, t) => s + t.total_cards, 0);
  // "Is this profile empty?" must count EVERY catalog. The tier rollup is
  // MJ-hierarchy-scoped (see migration 0007), so keying the thin-page check off it
  // would noindex a real collector who happens to own only Kobe or baseball cards.
  const cardCount = data.holdings.length;
  const description = hierarchyOwned
    ? `${name}'s card collection on Coqui Cardboard — ${hierarchyOwned} of ${total} MJ Hierarchy cards owned.`
    : cardCount
      ? `${name}'s card collection on Coqui Cardboard — ${cardCount} card${cardCount === 1 ? "" : "s"}.`
      : `${name}'s collector profile on Coqui Cardboard.`;

  return {
    title: `${name} — collection`,
    description,
    alternates: { canonical: `/u/${username}` },
    // An empty profile is the same thin-content problem the placeholder card pages
    // had; no reason to advertise it. `follow` so crawlers still traverse out.
    // Keyed on total holdings, not the MJ-scoped rollup — see cardCount above.
    ...(cardCount === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: `${name} · Coqui Cardboard`, description, url: `/u/${username}`, type: "profile" },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getPublicCollection(username);
  if (!data) notFound();

  const { profile, tiers, holdings } = data;
  const totalOwned = tiers.reduce((s, t) => s + t.owned_cards, 0);
  const totalCards = tiers.reduce((s, t) => s + t.total_cards, 0);
  const forTrade = holdings.filter((h) => h.for_trade);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">
        {profile.display_name || profile.username}
      </h1>
      <p className="mt-1 text-sm text-muted">@{profile.username}</p>
      {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}

      {/* The tier rollup counts the MJ Hierarchy only (migration 0007), while the
          list below shows every catalog — so say which number this is. Mirrors
          "Hierarchy complete" on /collection. */}
      <div className="mt-4 text-sm text-muted">
        {totalOwned} of {totalCards} MJ Hierarchy cards owned
        {holdings.length > totalOwned && <> · {holdings.length} cards in total</>}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((t) => {
          const c = TIER_COLORS[t.tier_id] ?? TIER_COLORS[4];
          const pct = t.total_cards ? Math.round((t.owned_cards / t.total_cards) * 100) : 0;
          return (
            <Panel key={t.tier_id} className="p-4">
              <div className={cn("font-sans text-[10px] uppercase tracking-wide", c.text)}>{t.tier_name}</div>
              <div className="mt-2 font-data text-base text-muted">{t.owned_cards} / {t.total_cards}</div>
              <div className="meter mt-2" style={{ ["--meter" as string]: `var(--tier-${t.tier_id})` } as React.CSSProperties}>
                <span style={{ width: `${pct}%` }} />
              </div>
            </Panel>
          );
        })}
      </div>

      {forTrade.length > 0 && (
        <section className="mt-10">
          <h2 className="border-b border-border pb-2 text-lg font-semibold">For trade ({forTrade.length})</h2>
          <ul className="mt-4 space-y-2">
            {forTrade.map((h) => (
              <li key={`${h.card_id}-${h.grade ?? "raw"}`} className="flex items-center gap-3 text-sm">
                <Link href={`/cards/${h.card_slug}`} className="hover:underline">{h.card_name}</Link>
                <Badge className="bg-foreground/5 ring-border">
                  {gradeLabel(h.condition_type, h.grading_company, h.grade)}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
