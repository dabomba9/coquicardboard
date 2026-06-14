"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { CardThumb } from "@/components/card-thumb";
import { toCsv } from "@/lib/csv";
import { cn, formatUsd, TIER_COLORS } from "@/lib/utils";
import type { CardWithSet } from "@/lib/types";

export type CollectionCard = CardWithSet & { copies: number; marketValueCents: number; forTrade: boolean };
type TierMeta = { id: number; name: string };
type SortKey = "tier" | "value" | "copies" | "year" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "tier", label: "Tier" },
  { key: "value", label: "Value" },
  { key: "copies", label: "Copies" },
  { key: "year", label: "Year" },
  { key: "name", label: "Name" },
];

const selectCls =
  "h-9 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CollectionGrid({ cards, tiers }: { cards: CollectionCard[]; tiers: TierMeta[] }) {
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState<Set<number>>(new Set());
  const [setName, setSetName] = useState("");
  const [year, setYear] = useState("");
  const [tradeOnly, setTradeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("tier");
  const [view, setView] = useState<"grid" | "list">("grid");

  const setOptions = useMemo(
    () => [...new Set(cards.map((c) => c.sets?.name).filter((v): v is string => !!v))].sort(),
    [cards]
  );
  const yearOptions = useMemo(
    () => [...new Set(cards.map((c) => c.year).filter((v): v is number => v != null))].sort((a, b) => b - a),
    [cards]
  );

  // Persist the grid/list preference (synced after mount to avoid a hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem("mj.collection.view");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("mj.collection.view", view);
  }, [view]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = cards.filter((c) => {
      if (needle && !`${c.name} ${c.sets?.name ?? ""}`.toLowerCase().includes(needle)) return false;
      if (tierFilter.size && !tierFilter.has(c.tier_id)) return false;
      if (setName && c.sets?.name !== setName) return false;
      if (year && String(c.year) !== year) return false;
      if (tradeOnly && !c.forTrade) return false;
      return true;
    });
    const cmp: Record<SortKey, (a: CollectionCard, b: CollectionCard) => number> = {
      tier: (a, b) => a.tier_id - b.tier_id || a.rarity_rank - b.rarity_rank,
      value: (a, b) => b.marketValueCents - a.marketValueCents,
      copies: (a, b) => b.copies - a.copies,
      year: (a, b) => (a.year ?? 0) - (b.year ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return out.sort(cmp[sortBy]);
  }, [cards, q, tierFilter, setName, year, tradeOnly, sortBy]);

  // Group into tier sections only when sorting by tier; otherwise one flat list.
  const groups = useMemo(() => {
    if (sortBy !== "tier") return [{ label: null as string | null, items: filtered }];
    const map = new Map<number, { label: string; items: CollectionCard[] }>();
    for (const c of filtered) {
      if (!map.has(c.tier_id)) {
        const t = tiers.find((x) => x.id === c.tier_id);
        map.set(c.tier_id, { label: t?.name ?? `Tier ${c.tier_id}`, items: [] });
      }
      map.get(c.tier_id)!.items.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
  }, [filtered, sortBy, tiers]);

  function toggleTier(id: number) {
    setTierFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function resetFilters() {
    setQ("");
    setTierFilter(new Set());
    setSetName("");
    setYear("");
    setTradeOnly(false);
  }
  const hasFilters = q !== "" || tierFilter.size > 0 || setName !== "" || year !== "" || tradeOnly;

  const tierName = (id: number) => tiers.find((t) => t.id === id)?.name ?? `Tier ${id}`;
  function exportCsv() {
    const rows = filtered.map((c) => [
      c.name,
      c.sets?.name ?? "",
      c.year ?? "",
      tierName(c.tier_id),
      c.copies,
      (c.marketValueCents / 100).toFixed(2),
      c.forTrade ? "yes" : "no",
    ]);
    const csv = toCsv(["Name", "Set", "Year", "Tier", "Copies", "Market Value USD", "For Trade"], rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "mj-collection.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-8">
      {/* Controls — modern command bar (mirrors the floating navbar) */}
      <div className="font-modern sticky top-20 z-10 mb-6 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.30)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your cards…"
              className="h-9 w-full rounded-full border border-border/60 bg-foreground/[0.03] pl-9 pr-3.5 text-sm text-foreground transition-colors placeholder:text-muted hover:border-border focus:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <select value={setName} onChange={(e) => setSetName(e.target.value)} className={selectCls} aria-label="Set">
            <option value="">All sets</option>
            {setOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls} aria-label="Year">
            <option value="">All years</option>
            {yearOptions.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted">Sort</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className={selectCls}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-foreground/[0.03] p-0.5">
              <button onClick={() => setView("grid")} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", view === "grid" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground")}>Grid</button>
              <button onClick={() => setView("list")} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", view === "list" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground")}>List</button>
            </div>
            <button
              onClick={exportCsv}
              title="Export the current view to CSV"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-xs font-medium text-muted transition-colors hover:border-border hover:text-foreground"
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {/* Tier chips + count */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {tiers.map((t) => {
            const c = TIER_COLORS[t.id] ?? TIER_COLORS[4];
            const active = tierFilter.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleTier(t.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active ? cn(c.text, "border-current bg-foreground/5") : "border-border/55 text-muted hover:border-border hover:text-foreground"
                )}
              >
                Tier {t.id}
              </button>
            );
          })}
          <button
            onClick={() => setTradeOnly((v) => !v)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              tradeOnly ? "border-accent bg-accent/12 text-accent" : "border-border/55 text-muted hover:border-border hover:text-foreground"
            )}
          >
            For trade
          </button>
          {hasFilters && (
            <button onClick={resetFilters} className="font-sans text-[9px] uppercase text-muted underline hover:text-foreground">Clear</button>
          )}
          <span className="ml-2 font-data text-sm text-muted">{filtered.length} cards</span>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No cards match your filters.</p>
      ) : (
        <div className="space-y-10">
          {groups.map((g, gi) => (
            <section key={g.label ?? gi}>
              {g.label && (
                <h2 className="border-b border-border/50 pb-2 font-sans text-sm uppercase tracking-wide">{g.label}</h2>
              )}
              {view === "grid" ? (
                <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8", g.label && "mt-4")}>
                  {g.items.map((card) => (
                    <Link key={card.id} href={`/collection/${card.slug}`} className="group relative">
                      <CardThumb card={card} className="transition-transform group-hover:-translate-y-1 border-[var(--gold)]" />
                      {card.copies > 1 && (
                        <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-[var(--gold)] px-1.5 text-[9px] font-semibold text-black">×{card.copies}</span>
                      )}
                      {card.forTrade && (
                        <span className="pointer-events-none absolute left-1 top-1 rounded-full bg-accent px-1.5 text-[9px] font-bold uppercase text-black">T</span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className={cn("space-y-1.5", g.label && "mt-4")}>
                  {g.items.map((card) => (
                    <Link
                      key={card.id}
                      href={`/collection/${card.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-border/45 bg-card/40 p-2 transition-colors hover:bg-card/70"
                    >
                      <div className="w-9 shrink-0">
                        <CardThumb card={card} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{card.name}</div>
                        <div className="truncate text-xs text-muted">
                          {[card.sets?.name, card.year].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      {card.forTrade && <span className="rounded-full bg-accent px-1.5 text-[9px] font-bold uppercase leading-4 text-black">T</span>}
                      {card.copies > 1 && <span className="font-data text-xs text-muted">×{card.copies}</span>}
                      <span className="font-num text-sm text-muted">{formatUsd(card.marketValueCents)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
