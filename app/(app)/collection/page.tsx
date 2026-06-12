import Link from "next/link";
import {
  getTiers, getCardsByTier, getMyHoldings, getCardIndex, getPriceMap, computeTierSummary,
  getPortfolioSeries,
} from "@/lib/queries";
import { PortfolioChart } from "@/components/portfolio-chart";
import { CompletionRing } from "@/components/completion-ring";
import { CollectionGrid } from "@/components/collection-grid";
import { Panel } from "@/components/ui/primitives";
import { cn, formatUsd, TIER_COLORS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const [tiers, byTier, holdings, cardIndex] = await Promise.all([
    getTiers(), getCardsByTier(), getMyHoldings(), getCardIndex(),
  ]);
  const priceMap = await getPriceMap([...new Set(holdings.map((h) => h.card_id))]);
  const summary = computeTierSummary(tiers, holdings, cardIndex, priceMap);
  const portfolio = await getPortfolioSeries(holdings);

  const ownedCardIds = new Set(holdings.map((h) => h.card_id));
  const copiesByCard = new Map<string, number>();
  for (const h of holdings) copiesByCard.set(h.card_id, (copiesByCard.get(h.card_id) ?? 0) + 1);
  const ownedFlat = tiers.flatMap((t) =>
    (byTier[t.id] ?? [])
      .filter((c) => ownedCardIds.has(c.id))
      .map((c) => ({ ...c, copies: copiesByCard.get(c.id) ?? 1 }))
  );
  const totalCards = tiers.reduce((s, t) => s + t.card_count, 0);
  const totalOwned = ownedCardIds.size;
  const totalValue = summary.reduce((s, t) => s + (t.est_value_cents ?? 0), 0);
  const costBasis = holdings.reduce((s, h) => s + (h.purchase_price_cents ?? 0), 0);
  const withCost = holdings.some((h) => h.purchase_price_cents != null);
  const gain = totalValue - costBasis;

  const stat = (label: string, value: string, sub: string, valueCls?: string) => (
    <Panel className="p-4">
      <div className="font-sans text-[9px] uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1 font-data text-2xl leading-none", valueCls)}>{value}</div>
      <div className="mt-1 text-[11px] text-muted">{sub}</div>
    </Panel>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">My Collection</h1>

      {totalOwned === 0 ? (
        <Panel className="mt-6 p-8 text-center text-sm text-muted">
          You haven&apos;t added any cards yet. Browse the{" "}
          <Link href="/mj-hierarchy" className="text-accent hover:underline">hierarchy</Link>{" "}
          and open a card to add a copy.
        </Panel>
      ) : (
        <>
          {/* Dashboard header: ring + stats */}
          <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr] lg:items-center">
            <Panel className="flex items-center gap-5 p-5">
              <CompletionRing owned={totalOwned} total={totalCards} />
              <div>
                <div className="text-sm font-medium">Collection complete</div>
                <div className="mt-1 text-sm text-muted">{totalOwned} of {totalCards} cards</div>
              </div>
            </Panel>
            <div className="grid gap-3 sm:grid-cols-3">
              {stat("Est. market value", formatUsd(totalValue), "estimated · not advice")}
              {stat("Cost basis", withCost ? formatUsd(costBasis) : "—", "sum of what you paid")}
              {stat(
                "Unrealized gain/loss",
                withCost ? `${gain >= 0 ? "+" : "−"}${formatUsd(Math.abs(gain))}` : "—",
                "market − cost",
                withCost ? (gain >= 0 ? "text-accent" : "text-red-500") : undefined
              )}
            </div>
          </div>

          {portfolio.length > 0 && (
            <Panel className="mt-4 p-4">
              <div className="mb-2 text-xs text-muted">Estimated value over time (current holdings)</div>
              <PortfolioChart points={portfolio} />
            </Panel>
          )}
        </>
      )}

      {totalOwned > 0 && (
      <>
      {/* Per-tier progress */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => {
          const c = TIER_COLORS[s.tier_id] ?? TIER_COLORS[4];
          const pct = s.total_cards ? Math.round((s.owned_cards / s.total_cards) * 100) : 0;
          return (
            <Panel key={s.tier_id} className="p-4">
              <div className={cn("font-sans text-[10px] uppercase tracking-wide", c.text)}>Tier {s.tier_id}</div>
              <div className="mt-1 text-sm font-medium">{s.tier_name}</div>
              <div className="mt-2 font-data text-base text-muted">{s.owned_cards} / {s.total_cards}</div>
              <div className="meter mt-2" style={{ ["--meter" as string]: `var(--tier-${s.tier_id})` } as React.CSSProperties}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 font-data text-base text-muted">{formatUsd(s.est_value_cents)}</div>
            </Panel>
          );
        })}
      </div>

      {/* Owned cards — modern filter bar + grid/list */}
      <CollectionGrid cards={ownedFlat} tiers={tiers.map((t) => ({ id: t.id, name: t.name }))} />
      </>
      )}
    </div>
  );
}
