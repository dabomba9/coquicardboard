"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { CardThumb } from "@/components/card-thumb";
import { Button } from "@/components/ui/primitives";
import { removeFromWantList, updateWantItem } from "@/lib/actions/holdings";
import { ebaySearchUrl, outboundRel } from "@/lib/affiliate";
import { playerForCatalog } from "@/lib/image-search";
import { groupByCatalog, isDeal, tierThenRank, wantSort } from "@/lib/want";
import { catalogLabel, catalogOrder } from "@/lib/catalogs";
import { cn, formatUsd } from "@/lib/utils";
import type { CardWithSet } from "@/lib/types";

export type WantCard = CardWithSet & {
  want_id: string;
  priority: number;
  target_cents: number | null;
  current_cents: number | null;
};
type SortKey = "priority" | "deal" | "catalog" | "value" | "year" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "priority", label: "Priority" },
  { key: "deal", label: "Best deal" },
  { key: "catalog", label: "Catalog" },
  { key: "value", label: "Value" },
  { key: "year", label: "Year" },
  { key: "name", label: "Name" },
];

const PRIORITY_LABEL: Record<number, string> = { 1: "High", 2: "Med", 3: "Low" };

export function WantListGrid({ cards }: { cards: WantCard[] }) {
  const [q, setQ] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [view, setView] = useState<"grid" | "list">("grid");
  // Optimistic edits keyed by card id, so changes show instantly.
  const [prioEdits, setPrioEdits] = useState<Record<string, number>>({});
  const [targetEdits, setTargetEdits] = useState<Record<string, number | null>>({});
  const [, startTx] = useTransition();

  const prioOf = (c: WantCard) => prioEdits[c.id] ?? c.priority;
  const targetOf = (c: WantCard) => (c.id in targetEdits ? targetEdits[c.id] : c.target_cents);

  // Persist the grid/list preference (synced after mount to avoid a hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem("mj.wantlist.view");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("mj.wantlist.view", view);
  }, [view]);

  function setPriority(c: WantCard, priority: number) {
    setPrioEdits((p) => ({ ...p, [c.id]: priority }));
    startTx(async () => {
      const res = await updateWantItem(c.id, { priority });
      if (res?.error) toast.error(res.error);
    });
  }
  function setTarget(c: WantCard, dollars: string) {
    const trimmed = dollars.trim();
    const cents = trimmed === "" ? null : Math.round(parseFloat(trimmed) * 100);
    if (cents != null && (!Number.isFinite(cents) || cents < 0)) { toast.error("Enter a valid price"); return; }
    if (cents === targetOf(c)) return; // no change
    setTargetEdits((t) => ({ ...t, [c.id]: cents }));
    startTx(async () => {
      const res = await updateWantItem(c.id, { maxPriceCents: cents });
      if (res?.error) toast.error(res.error);
      else toast.success(cents == null ? "Target cleared" : `Target set to ${formatUsd(cents)}`);
    });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = cards.filter((c) => {
      if (needle && !`${c.name} ${c.sets?.name ?? ""}`.toLowerCase().includes(needle)) return false;
      if (catalogFilter.size && !catalogFilter.has(c.catalog)) return false;
      return true;
    });
    const cmp: Record<SortKey, (a: WantCard, b: WantCard) => number> = {
      priority: (a, b) => prioOf(a) - prioOf(b) || tierThenRank(a, b),
      deal: (a, b) => wantSort({ current_cents: a.current_cents, target_cents: targetOf(a) }, { current_cents: b.current_cents, target_cents: targetOf(b) }),
      catalog: (a, b) => catalogOrder(a.catalog) - catalogOrder(b.catalog) || tierThenRank(a, b),
      value: (a, b) => (b.current_cents ?? 0) - (a.current_cents ?? 0),
      year: (a, b) => (a.year ?? 0) - (b.year ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return out.sort(cmp[sortBy]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, q, catalogFilter, sortBy, prioEdits, targetEdits]);

  // Group into catalog sections only when sorting by catalog; otherwise one flat list.
  // (Not MJ tiers: vault cards have no tier and Kobe/Mamba tier ids are cosmetic.)
  const groups = useMemo(() => {
    if (sortBy !== "catalog") return [{ label: null as string | null, items: filtered }];
    return groupByCatalog(filtered, catalogOrder).map((g) => ({ label: catalogLabel(g.catalog) as string | null, items: g.items }));
  }, [filtered, sortBy]);

  // Only the catalogs actually on this list get a chip.
  const catalogsPresent = useMemo(
    () => [...new Set(cards.map((c) => c.catalog))].sort((a, b) => catalogOrder(a) - catalogOrder(b)),
    [cards]
  );

  function toggleCatalog(id: string) {
    setCatalogFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function resetFilters() {
    setQ("");
    setCatalogFilter(new Set());
  }
  const hasFilters = q !== "" || catalogFilter.size > 0;
  const dealCount = cards.filter((c) => isDeal(c.current_cents, targetOf(c))).length;

  // Per-item priority select + target input + current/target readout. Reused by both views.
  function Controls({ card }: { card: WantCard }) {
    const target = targetOf(card);
    const deal = isDeal(card.current_cents, target);
    return (
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-1">
          <select
            aria-label="Priority"
            value={prioOf(card)}
            onChange={(e) => setPriority(card, Number(e.target.value))}
            className="h-7 flex-1 rounded-md border border-border/60 bg-foreground/[0.03] px-1.5 text-[11px] text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={1}>High</option>
            <option value={2}>Med</option>
            <option value={3}>Low</option>
          </select>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] text-muted">$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              aria-label="Target price"
              defaultValue={target != null ? (target / 100).toString() : ""}
              placeholder="Target"
              onBlur={(e) => setTarget(card, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="h-7 w-full rounded-md border border-border/60 bg-foreground/[0.03] pl-4 pr-1 text-[11px] text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">Now {card.current_cents != null ? formatUsd(card.current_cents) : "—"}</span>
          {deal && <span className="font-medium text-accent">✓ Under target</span>}
        </div>
        {/* The want list is the highest-intent surface in the app — someone has said
            they want this card and named a price — and it had no buy link at all.
            `Controls` renders outside the tile's <Link> in both the grid and list
            views, so one anchor here covers both without nesting anchors. */}
        <a
          href={ebaySearchUrl(`${card.name} ${playerForCatalog(card.catalog)}`, `${card.slug}:want`)}
          target="_blank"
          rel={outboundRel}
          className="block rounded-md border border-border/60 py-1 text-center text-[11px] font-medium text-accent transition-colors hover:border-accent/60 hover:bg-accent/[0.08]"
        >
          Find on eBay ↗
        </a>
      </div>
    );
  }

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

        {/* Catalog chips + count (hidden when everything is from one catalog) */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {catalogsPresent.length > 1 && catalogsPresent.map((slug) => {
            const active = catalogFilter.has(slug);
            return (
              <button
                key={slug}
                onClick={() => toggleCatalog(slug)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active ? "border-current bg-foreground/5 text-accent" : "border-border/55 text-muted hover:border-border hover:text-foreground"
                )}
              >
                {catalogLabel(slug)}
              </button>
            );
          })}
          {hasFilters && (
            <button onClick={resetFilters} className="font-sans text-[9px] uppercase text-muted underline hover:text-foreground">Clear</button>
          )}
          <span className="ml-2 font-data text-sm text-muted">{filtered.length} cards</span>
          {dealCount > 0 && <span className="font-data text-sm text-accent">· {dealCount} under target</span>}
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
                <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6", g.label && "mt-4")}>
                  {g.items.map((card) => {
                    const deal = isDeal(card.current_cents, targetOf(card));
                    return (
                      <div key={card.want_id} className="group">
                        <Link href={`/cards/${card.slug}`} className="relative block">
                          <CardThumb card={card} className={cn("transition-transform group-hover:-translate-y-1", deal && "ring-2 ring-accent")} />
                          <span className="pointer-events-none absolute left-1 top-1 bg-background/80 px-1 font-sans text-[9px] uppercase text-muted backdrop-blur-sm">{PRIORITY_LABEL[prioOf(card)] ?? "Med"}</span>
                        </Link>
                        <Controls card={card} />
                        <form action={removeFromWantList.bind(null, card.id)} className="mt-1">
                          <Button size="sm" variant="ghost" type="submit" className="w-full text-xs text-muted">Remove</Button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={cn("space-y-1.5", g.label && "mt-4")}>
                  {g.items.map((card) => {
                    const deal = isDeal(card.current_cents, targetOf(card));
                    return (
                      <div key={card.want_id} className={cn("flex items-center gap-3 rounded-xl border p-2 transition-colors", deal ? "border-accent/60 bg-accent/[0.06]" : "border-border/45 bg-card/40 hover:bg-card/70")}>
                        <Link href={`/cards/${card.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="w-9 shrink-0">
                            <CardThumb card={card} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{card.name}</div>
                            <div className="truncate text-xs text-muted">
                              {[card.sets?.name, card.year].filter(Boolean).join(" · ")}
                              {deal && <span className="ml-2 text-accent">✓ under target</span>}
                            </div>
                          </div>
                        </Link>
                        <div className="w-44 shrink-0"><Controls card={card} /></div>
                        <form action={removeFromWantList.bind(null, card.id)}>
                          <Button size="sm" variant="ghost" type="submit" className="text-xs text-muted">Remove</Button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
