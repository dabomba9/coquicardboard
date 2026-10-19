import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicCollection } from "@/lib/queries";
import { catalogLabel, catalogMeta, catalogOrder } from "@/lib/catalogs";
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
  const catalogs = sortedCatalogs(data.catalogs);
  const description = catalogs.length > 1
    ? `${name}'s card collection on Coqui Cardboard — ${cardCount} cards across ${catalogs.map((c) => catalogLabel(c.catalog)).join(", ")}.`
    : hierarchyOwned
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

// `catalogs` arrives with migration 0008. Until a database has it, the key is
// absent and the page falls back to the MJ tier view it always had.
function sortedCatalogs(c: { catalog: string; owned_cards: number; total_cards: number }[] | undefined) {
  return [...(c ?? [])].sort((a, b) => catalogOrder(a.catalog) - catalogOrder(b.catalog));
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
  const catalogs = sortedCatalogs(data.catalogs);
  const totalOwned = tiers.reduce((s, t) => s + t.owned_cards, 0);
  const totalCards = tiers.reduce((s, t) => s + t.total_cards, 0);
  const forTrade = holdings.filter((h) => h.for_trade);
  // Before 0008 there is no per-catalog data: keep the MJ tier panels as the headline.
  const showTiers = catalogs.length === 0 || totalOwned > 0;
  const tradeGroups = Object.entries(
    forTrade.reduce<Record<string, typeof forTrade>>((acc, h) => {
      (acc[h.catalog ?? ""] ??= []).push(h);
      return acc;
    }, {})
  ).sort(([a], [b]) => catalogOrder(a) - catalogOrder(b));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">
        {profile.display_name || profile.username}
      </h1>
      <p className="mt-1 text-sm text-muted">@{profile.username}</p>
      {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}

      <div className="mt-4 text-sm text-muted">
        {catalogs.length > 0 ? (
          <>{holdings.length} card{holdings.length === 1 ? "" : "s"} across {catalogs.length} catalog{catalogs.length === 1 ? "" : "s"}</>
        ) : (
          // Pre-0008 fallback. The tier rollup counts the MJ Hierarchy only (0007),
          // so say which number this is.
          <>
            {totalOwned} of {totalCards} MJ Hierarchy cards owned
            {holdings.length > totalOwned && <> · {holdings.length} cards in total</>}
          </>
        )}
      </div>

      {catalogs.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalogs.map((c) => {
            const pct = c.total_cards ? Math.round((c.owned_cards / c.total_cards) * 100) : 0;
            const href = catalogMeta(c.catalog)?.href;
            const label = catalogLabel(c.catalog);
            return (
              <Panel key={c.catalog} className="p-4">
                <div className="font-sans text-[10px] uppercase tracking-wide text-accent">
                  {href ? <Link href={href} className="hover:underline">{label}</Link> : label}
                </div>
                <div className="mt-2 font-data text-base text-muted">{c.owned_cards} / {c.total_cards}</div>
                <div className="meter mt-2" style={{ ["--meter" as string]: "var(--accent)" } as React.CSSProperties}>
                  <span style={{ width: `${pct}%` }} />
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {showTiers && (
        <>
          {catalogs.length > 0 && (
            <h2 className="mt-8 font-sans text-xs uppercase tracking-wide text-muted">MJ Hierarchy by tier</h2>
          )}
          <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", catalogs.length > 0 ? "mt-3" : "mt-6")}>
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
        </>
      )}

      {forTrade.length > 0 && (
        <section className="mt-10">
          <h2 className="border-b border-border pb-2 text-lg font-semibold">For trade ({forTrade.length})</h2>
          {tradeGroups.map(([catalog, items]) => (
            <div key={catalog || "all"} className="mt-4">
              {/* Group headings only once there's something to tell apart. */}
              {catalog && tradeGroups.length > 1 && (
                <h3 className="font-sans text-[10px] uppercase tracking-wide text-muted">{catalogLabel(catalog)}</h3>
              )}
              <ul className="mt-2 space-y-2">
                {items.map((h) => (
                  <li key={`${h.card_id}-${h.grade ?? "raw"}`} className="flex items-center gap-3 text-sm">
                    <Link href={`/cards/${h.card_slug}`} className="hover:underline">{h.card_name}</Link>
                    <Badge className="bg-foreground/5 ring-border">
                      {gradeLabel(h.condition_type, h.grading_company, h.grade)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
