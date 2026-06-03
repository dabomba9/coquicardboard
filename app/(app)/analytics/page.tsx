import Link from "next/link";
import {
  getMyHoldings, getOwnedCardMeta, getPriceMap, getPriceHistoryForCards, getWatchlistDeals,
} from "@/lib/queries";
import { valueByGroup, biggestMovers, rarityHighlights, holdingValue, type GroupRow } from "@/lib/analytics";
import { Panel } from "@/components/ui/primitives";
import { formatUsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

function BarList({ rows }: { rows: GroupRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span>{r.label} <span className="text-xs text-muted">· {r.count}</span></span>
            <span className="font-medium">{formatUsd(r.value)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/5">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-muted">No data.</p>}
    </div>
  );
}

const pct = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

export default async function AnalyticsPage() {
  const holdings = await getMyHoldings();
  const ownedIds = [...new Set(holdings.map((h) => h.card_id))];
  const [meta, priceMap, history, deals] = await Promise.all([
    getOwnedCardMeta(ownedIds),
    getPriceMap(ownedIds),
    getPriceHistoryForCards(ownedIds),
    getWatchlistDeals(),
  ]);

  const totalValue = holdings.reduce((s, h) => s + holdingValue(h, priceMap, meta), 0);
  const byTier = valueByGroup(holdings, meta, priceMap, "tier");
  const bySet = valueByGroup(holdings, meta, priceMap, "set").slice(0, 8);
  const byGrade = valueByGroup(holdings, meta, priceMap, "grade");
  const { gainers, losers } = biggestMovers(holdings, meta, history);
  const rarity = rarityHighlights(holdings, meta);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
      <p className="mt-1 text-sm text-muted">
        Analytics for your collection · est. market value {formatUsd(totalValue)} ·{" "}
        <span className="text-xs">estimated, not investment advice</span>
      </p>

      {holdings.length === 0 ? (
        <Panel className="mt-6 p-8 text-center text-sm text-muted">
          Add cards to your collection to see analytics. Start from the{" "}
          <Link href="/mj-hierarchy" className="text-amber-500 hover:underline">hierarchy</Link>.
        </Panel>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel className="p-5">
            <h2 className="text-sm font-semibold">Value by tier</h2>
            <div className="mt-3"><BarList rows={byTier} /></div>
          </Panel>
          <Panel className="p-5">
            <h2 className="text-sm font-semibold">Value by grade</h2>
            <div className="mt-3"><BarList rows={byGrade} /></div>
          </Panel>
          <Panel className="p-5">
            <h2 className="text-sm font-semibold">Top sets by value</h2>
            <div className="mt-3"><BarList rows={bySet} /></div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-sm font-semibold">Biggest movers <span className="text-xs font-normal text-muted">(over history window)</span></h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-emerald-500">▲ Gainers</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {gainers.map((m) => (
                    <li key={m.cardId + m.gradeKey} className="flex justify-between gap-2">
                      <Link href={`/cards/${m.slug}`} className="truncate hover:underline">{m.name}</Link>
                      <span className="shrink-0 text-emerald-500">{pct(m.pct)}</span>
                    </li>
                  ))}
                  {gainers.length === 0 && <li className="text-muted">—</li>}
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium text-red-500">▼ Decliners</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {losers.map((m) => (
                    <li key={m.cardId + m.gradeKey} className="flex justify-between gap-2">
                      <Link href={`/cards/${m.slug}`} className="truncate hover:underline">{m.name}</Link>
                      <span className="shrink-0 text-red-500">{pct(m.pct)}</span>
                    </li>
                  ))}
                  {losers.length === 0 && <li className="text-muted">—</li>}
                </ul>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-sm font-semibold">Rarity</h2>
            <div className="mt-3 flex gap-6 text-sm">
              <div><div className="text-xl font-semibold">{rarity.ownedCount}</div><div className="text-muted">cards owned</div></div>
              <div><div className="text-xl font-semibold">{rarity.serialOwned}</div><div className="text-muted">serial-numbered</div></div>
            </div>
            {rarity.lowestPrints.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-muted">Lowest print runs owned</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {rarity.lowestPrints.map((p) => (
                    <li key={p.slug} className="flex justify-between gap-2">
                      <Link href={`/cards/${p.slug}`} className="truncate hover:underline">{p.name}</Link>
                      <span className="shrink-0 text-muted">/{p.print_run}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel className="p-5">
            <h2 className="text-sm font-semibold">Watchlist deals <span className="text-xs font-normal text-muted">(at/below your target)</span></h2>
            {deals.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No wanted cards are at target. Set a max price on{" "}
                <Link href="/want-list" className="text-amber-500 hover:underline">want-list</Link> items.
              </p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {deals.map((d) => (
                  <li key={d.slug} className="flex items-center justify-between gap-2">
                    <Link href={`/cards/${d.slug}`} className="truncate hover:underline">{d.name}</Link>
                    <span className="shrink-0">
                      <span className="text-emerald-500">{formatUsd(d.current)}</span>
                      <span className="text-muted"> ≤ {formatUsd(d.target)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
