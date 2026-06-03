import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicCollection } from "@/lib/queries";
import { Badge, Panel } from "@/components/ui/primitives";
import { cn, gradeLabel, TIER_COLORS } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
      <h1 className="text-2xl font-semibold tracking-tight">
        {profile.display_name || profile.username}
      </h1>
      <p className="mt-1 text-sm text-muted">@{profile.username}</p>
      {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}

      <div className="mt-4 text-sm text-muted">{totalOwned} of {totalCards} cards owned</div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((t) => {
          const c = TIER_COLORS[t.tier_id] ?? TIER_COLORS[4];
          const pct = t.total_cards ? Math.round((t.owned_cards / t.total_cards) * 100) : 0;
          return (
            <Panel key={t.tier_id} className="p-4">
              <div className={cn("text-xs font-semibold uppercase", c.text)}>{t.tier_name}</div>
              <div className="mt-2 text-sm text-muted">{t.owned_cards} / {t.total_cards}</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/5">
                <div className={cn("h-full rounded-full", c.bar)} style={{ width: `${pct}%` }} />
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
