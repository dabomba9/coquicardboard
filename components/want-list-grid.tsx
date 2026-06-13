"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CardThumb } from "@/components/card-thumb";
import { Button } from "@/components/ui/primitives";
import { removeFromWantList } from "@/lib/actions/holdings";
import { cn, formatUsd, TIER_COLORS } from "@/lib/utils";
import type { CardWithSet } from "@/lib/types";

export type WantCard = CardWithSet & { want_id: string; priority: number };
type TierMeta = { id: number; name: string };
type SortKey = "priority" | "tier" | "value" | "year" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "priority", label: "Priority" },
  { key: "tier", label: "Tier" },
  { key: "value", label: "Value" },
  { key: "year", label: "Year" },
  { key: "name", label: "Name" },
];

const PRIORITY_LABEL: Record<number, string> = { 1: "High", 2: "Med", 3: "Low" };

export function WantListGrid({ cards, tiers }: { cards: WantCard[]; tiers: TierMeta[] }) {
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Persist the grid/list preference (synced after mount to avoid a hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem("mj.wantlist.view");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("mj.wantlist.view", view);
  }, [view]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = cards.filter((c) => {
      if (needle && !`${c.name} ${c.sets?.name ?? ""}`.toLowerCase().includes(needle)) return false;
      if (tierFilter.size && !tierFilter.has(c.tier_id)) return false;
      return true;
    });
    const cmp: Record<SortKey, (a: WantCard, b: WantCard) => number> = {
      priority: (a, b) => a.priority - b.priority || a.tier_id - b.tier_id,
      tier: (a, b) => a.tier_id - b.tier_id || a.rarity_rank - b.rarity_rank,
      value: (a, b) => (b.catalog_value_cents ?? 0) - (a.catalog_value_cents ?? 0),
      year: (a, b) => (a.year ?? 0) - (b.year ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return out.sort(cmp[sortBy]);
  }, [cards, q, tierFilter, sortBy]);

  // Group into tier sections only when sorting by tier; otherwise one flat list.
  const groups = useMemo(() => {
    if (sortBy !== "tier") return [{ label: null as string | null, items: filtered }];
    const map = new Map<number, { label: string; items: WantCard[] }>();
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
  }
  const hasFilters = q !== "" || tierFilter.size > 0;

  return (
    <div className="mt-6">
      {/* Controls — modern command bar (mirrors the floating navbar) */}
      <div className="font-modern sticky top-20 z-10 mb-6 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.30)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your want list…"
              className="h-9 w-full rounded-full border border-border/60 bg-foreground/[0.03] pl-9 pr-3.5 text-sm text-foreground transition-colors placeholder:text-muted hover:border-border focus:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted">Sort</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="h-9 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-foreground/[0.03] p-0.5">
              <button onClick={() => setView("grid")} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", view === "grid" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground")}>Grid</button>
              <button onClick={() => setView("list")} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", view === "list" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground")}>List</button>
            </div>
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
                    <div key={card.want_id} className="group">
                      <Link href={`/cards/${card.slug}`} className="relative block">
                        <CardThumb card={card} className="transition-transform group-hover:-translate-y-1" />
                        <span className="pointer-events-none absolute left-1 top-1 bg-background/80 px-1 font-sans text-[9px] uppercase text-muted backdrop-blur-sm">{PRIORITY_LABEL[card.priority] ?? "Med"}</span>
                      </Link>
                      <form action={removeFromWantList.bind(null, card.id)} className="mt-1">
                        <Button size="sm" variant="ghost" type="submit" className="w-full text-xs text-muted">Remove</Button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={cn("space-y-1.5", g.label && "mt-4")}>
                  {g.items.map((card) => (
                    <div key={card.want_id} className="flex items-center gap-3 rounded-xl border border-border/45 bg-card/40 p-2 transition-colors hover:bg-card/70">
                      <Link href={`/cards/${card.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="w-9 shrink-0">
                          <CardThumb card={card} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{card.name}</div>
                          <div className="truncate text-xs text-muted">
                            {[card.sets?.name, card.year].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </Link>
                      <span className="font-sans text-[10px] uppercase text-muted">{PRIORITY_LABEL[card.priority] ?? "Med"}</span>
                      <span className="font-num text-sm text-muted">{formatUsd(card.catalog_value_cents)}</span>
                      <form action={removeFromWantList.bind(null, card.id)}>
                        <Button size="sm" variant="ghost" type="submit" className="text-xs text-muted">Remove</Button>
                      </form>
                    </div>
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
