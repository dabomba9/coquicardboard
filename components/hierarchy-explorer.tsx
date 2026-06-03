"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { CardThumb } from "@/components/card-thumb";
import { quickAddOwned } from "@/lib/actions/holdings";
import { Badge, Input, Select } from "@/components/ui/primitives";
import { cn, formatUsd, TIER_COLORS } from "@/lib/utils";

export type ExplorerCard = {
  id: string;
  slug: string;
  name: string;
  tier_id: number;
  card_number: string | null;
  year: number | null;
  set_name: string | null;
  set_slug: string | null;
  image_url: string | null;
  rarity_rank: number;
  is_rookie: boolean;
  is_insert: boolean;
  is_parallel: boolean;
  serial_numbered: boolean;
  value_cents: number;
  owned: boolean;
  for_trade: boolean;
};

type Attr = "serial" | "rookie" | "insert" | "parallel";
const ATTRS: { key: Attr; label: string; test: (c: ExplorerCard) => boolean }[] = [
  { key: "serial", label: "Serial #'d", test: (c) => c.serial_numbered },
  { key: "rookie", label: "Rookie", test: (c) => c.is_rookie },
  { key: "insert", label: "Insert", test: (c) => c.is_insert },
  { key: "parallel", label: "Parallel", test: (c) => c.is_parallel },
];

type TierMeta = { id: number; name: string; card_count: number };

type SortKey = "rarity" | "value" | "year" | "name" | "set";
type GroupKey = "tier" | "set";
type Ownership = "all" | "owned" | "needed";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rarity", label: "Rarity" },
  { key: "value", label: "Value" },
  { key: "year", label: "Year" },
  { key: "name", label: "Name" },
  { key: "set", label: "Set" },
];

export function HierarchyExplorer({
  cards,
  tiers,
  signedIn,
}: {
  cards: ExplorerCard[];
  tiers: TierMeta[];
  signedIn: boolean;
}) {
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState<Set<number>>(new Set());
  const [setFilter, setSetFilter] = useState("");
  const [ownership, setOwnership] = useState<Ownership>("all");
  const [forTradeOnly, setForTradeOnly] = useState(false);
  const [attrs, setAttrs] = useState<Set<Attr>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("rarity");
  const [groupBy, setGroupBy] = useState<GroupKey>("tier");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [ownedLocal, setOwnedLocal] = useState<Set<string>>(new Set());
  const [, startAdd] = useTransition();

  const isOwned = (c: ExplorerCard) => c.owned || ownedLocal.has(c.id);

  function quickAdd(card: ExplorerCard) {
    if (isOwned(card)) return;
    startAdd(async () => {
      const res = await quickAddOwned(card.id);
      if (res?.error) { toast.error(res.error); return; }
      const next = new Set(ownedLocal).add(card.id);
      setOwnedLocal(next);
      // Tier completion check → confetti.
      const tier = tiers.find((t) => t.id === card.tier_id);
      const ownedInTier = cards.filter((c) => c.tier_id === card.tier_id && (c.owned || next.has(c.id))).length;
      if (tier && ownedInTier === tier.card_count) {
        confetti({ particleCount: 140, spread: 75, origin: { y: 0.7 } });
        toast.success(`Tier ${tier.id} complete — ${tier.name}! 🏆`);
      } else {
        toast.success("Added to your collection");
      }
    });
  }

  // Persist the grid/list preference.
  useEffect(() => {
    const saved = localStorage.getItem("mj.hierarchy.view");
    // Sync the persisted preference after mount (kept out of initial state to
    // avoid an SSR/client hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("mj.hierarchy.view", view);
  }, [view]);

  const setNames = useMemo(
    () => [...new Set(cards.map((c) => c.set_name).filter(Boolean))].sort() as string[],
    [cards]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = cards.filter((c) => {
      if (needle && !`${c.name} ${c.set_name ?? ""}`.toLowerCase().includes(needle)) return false;
      if (tierFilter.size && !tierFilter.has(c.tier_id)) return false;
      if (setFilter && c.set_name !== setFilter) return false;
      if (ownership === "owned" && !isOwned(c)) return false;
      if (ownership === "needed" && isOwned(c)) return false;
      if (forTradeOnly && !c.for_trade) return false;
      for (const a of attrs) {
        const def = ATTRS.find((x) => x.key === a);
        if (def && !def.test(c)) return false;
      }
      return true;
    });
    const cmp: Record<SortKey, (a: ExplorerCard, b: ExplorerCard) => number> = {
      rarity: (a, b) => a.tier_id - b.tier_id || a.rarity_rank - b.rarity_rank,
      value: (a, b) => b.value_cents - a.value_cents,
      year: (a, b) => (a.year ?? 0) - (b.year ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
      set: (a, b) => (a.set_name ?? "").localeCompare(b.set_name ?? "") || a.rarity_rank - b.rarity_rank,
    };
    return out.sort(cmp[sortBy]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, q, tierFilter, setFilter, ownership, forTradeOnly, attrs, sortBy, ownedLocal]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; sortRank: number; items: ExplorerCard[] }>();
    for (const c of filtered) {
      if (groupBy === "tier") {
        const t = tiers.find((x) => x.id === c.tier_id);
        const key = `t${c.tier_id}`;
        if (!map.has(key)) map.set(key, { label: `Tier ${c.tier_id} · ${t?.name ?? ""}`, sortRank: c.tier_id, items: [] });
        map.get(key)!.items.push(c);
      } else {
        const key = c.set_name ?? "Unassigned";
        if (!map.has(key)) map.set(key, { label: key, sortRank: c.year ?? 9999, items: [] });
        map.get(key)!.items.push(c);
      }
    }
    return [...map.values()].sort((a, b) => a.sortRank - b.sortRank);
  }, [filtered, groupBy, tiers]);

  const ownedCount = filtered.filter(isOwned).length;

  function toggleTier(id: number) {
    setTierFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAttr(a: Attr) {
    setAttrs((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  }
  function resetFilters() {
    setQ(""); setTierFilter(new Set()); setSetFilter(""); setOwnership("all");
    setForTradeOnly(false); setAttrs(new Set());
  }

  // Progress facets over the FULL catalog (owned/total), independent of filters.
  const progress = (subset: ExplorerCard[]) => {
    const total = subset.length;
    const owned = subset.filter(isOwned).length;
    return { owned, total, pct: total ? Math.round((owned / total) * 100) : 0 };
  };
  const facets = [
    { label: "Collected", ...progress(cards), onClick: resetFilters, active: tierFilter.size === 0 && attrs.size === 0 && !setFilter && !forTradeOnly && ownership === "all" },
    ...tiers.map((t) => ({
      label: `Tier ${t.id}`, ...progress(cards.filter((c) => c.tier_id === t.id)),
      onClick: () => { setAttrs(new Set()); setTierFilter(new Set([t.id])); }, active: tierFilter.size === 1 && tierFilter.has(t.id),
    })),
    { label: "Serial #'d", ...progress(cards.filter((c) => c.serial_numbered)), onClick: () => toggleAttr("serial"), active: attrs.has("serial") },
  ];

  return (
    <div>
      {/* Progress facets (your collection) — also click to filter */}
      {signedIn && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {facets.map((f) => (
            <button
              key={f.label}
              onClick={f.onClick}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                f.active ? "border-amber-500/60 bg-amber-500/5" : "border-border hover:bg-foreground/5"
              )}
            >
              <div className="text-xs text-muted">{f.label}</div>
              <div className="mt-0.5 text-sm font-semibold">{f.owned}/{f.total}</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${f.pct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-muted">{f.pct}% complete</div>
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="sticky top-14 z-10 -mx-4 mb-6 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or set…"
            className="h-9 max-w-xs"
          />
          <Select value={setFilter} onChange={(e) => setSetFilter(e.target.value)} className="h-9 w-auto">
            <option value="">All sets</option>
            {setNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={ownership} onChange={(e) => setOwnership(e.target.value as Ownership)} className="h-9 w-auto" disabled={!signedIn}>
            <option value="all">All</option>
            <option value="owned">Owned</option>
            <option value="needed">Needed</option>
          </Select>
          <label className={cn("flex items-center gap-1.5 text-sm", !signedIn && "opacity-50")}>
            <input type="checkbox" checked={forTradeOnly} disabled={!signedIn} onChange={(e) => setForTradeOnly(e.target.checked)} />
            For trade
          </label>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted">Sort</span>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="h-9 w-auto">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
            <span className="text-muted">Group</span>
            <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupKey)} className="h-9 w-auto">
              <option value="tier">Tier</option>
              <option value="set">Set</option>
            </Select>
            <div className="flex overflow-hidden rounded-md border border-border">
              <button onClick={() => setView("grid")} className={cn("px-2.5 py-1.5 text-xs", view === "grid" ? "bg-foreground/10" : "text-muted")}>Grid</button>
              <button onClick={() => setView("list")} className={cn("px-2.5 py-1.5 text-xs", view === "list" ? "bg-foreground/10" : "text-muted")}>List</button>
            </div>
          </div>
        </div>

        {/* Tier chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {tiers.map((t) => {
            const c = TIER_COLORS[t.id] ?? TIER_COLORS[4];
            const active = tierFilter.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleTier(t.id)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs ring-1 transition-colors",
                  active ? cn(c.bg, c.text, c.ring) : "text-muted ring-border hover:text-foreground"
                )}
              >
                Tier {t.id}
              </button>
            );
          })}
          <span className="mx-1 h-4 w-px bg-border" />
          {ATTRS.map((a) => {
            const active = attrs.has(a.key);
            return (
              <button
                key={a.key}
                onClick={() => toggleAttr(a.key)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs ring-1 transition-colors",
                  active ? "bg-amber-500/15 text-amber-600 ring-amber-500/40 dark:text-amber-300" : "text-muted ring-border hover:text-foreground"
                )}
              >
                {a.label}
              </button>
            );
          })}
          {(tierFilter.size > 0 || attrs.size > 0 || setFilter || forTradeOnly || ownership !== "all" || q) && (
            <button onClick={resetFilters} className="text-xs text-muted underline hover:text-foreground">Clear</button>
          )}
          <span className="ml-2 text-xs text-muted">
            {filtered.length} cards{signedIn ? ` · ${ownedCount} owned` : ""}
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-10">
        {groups.map((g) => {
          const ownedN = g.items.filter(isOwned).length;
          const pct = g.items.length ? Math.round((ownedN / g.items.length) * 100) : 0;
          return (
          <section key={g.label}>
            <div className="flex items-baseline justify-between border-b border-border pb-2">
              <h2 className="text-lg font-semibold">{g.label}</h2>
              <span className="text-sm text-muted">
                {signedIn ? `${ownedN} / ${g.items.length}` : `${g.items.length}`}
              </span>
            </div>
            {signedIn && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/5">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
              </div>
            )}

            {view === "grid" ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {g.items.map((card) => {
                  const owned = isOwned(card);
                  return (
                  <div key={card.id} className="group relative">
                    <Link href={`/cards/${card.slug}`}>
                      <CardThumb
                        card={{ ...card, sets: card.set_name ? { name: card.set_name } : null }}
                        className={cn("transition-transform group-hover:-translate-y-1", owned && "ring-2 ring-amber-400")}
                      />
                    </Link>
                    {owned && <Badge className="pointer-events-none absolute right-1 top-1 bg-amber-500 text-black ring-amber-400">✓</Badge>}
                    {card.for_trade && <Badge className="pointer-events-none absolute left-1 top-1 bg-emerald-500 text-black ring-emerald-400">T</Badge>}
                    {signedIn && !owned && (
                      <button
                        type="button"
                        aria-label="Add to my collection"
                        onClick={(e) => { e.preventDefault(); quickAdd(card); }}
                        className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-black opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-amber-400"
                        title="Quick add (owned)"
                      >
                        +
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="py-1.5 pr-2">Card</th>
                    <th className="py-1.5 pr-2">Set</th>
                    <th className="py-1.5 pr-2">Year</th>
                    <th className="py-1.5 pr-2">#</th>
                    <th className="py-1.5 pr-2">Tier</th>
                    <th className="py-1.5 pr-2 text-right">Value</th>
                    {signedIn && <th className="py-1.5 pr-2 text-center">Owned</th>}
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((card) => (
                    <tr key={card.id} className="border-t border-border hover:bg-foreground/5">
                      <td className="py-1.5 pr-2">
                        <Link href={`/cards/${card.slug}`} className="font-medium hover:underline">{card.name}</Link>
                      </td>
                      <td className="py-1.5 pr-2 text-muted">{card.set_name}</td>
                      <td className="py-1.5 pr-2 text-muted">{card.year}</td>
                      <td className="py-1.5 pr-2 text-muted">{card.card_number ? `#${card.card_number}` : ""}</td>
                      <td className="py-1.5 pr-2 text-muted">{card.tier_id}</td>
                      <td className="py-1.5 pr-2 text-right">{card.value_cents ? formatUsd(card.value_cents) : "—"}</td>
                      {signedIn && <td className="py-1.5 pr-2 text-center">{isOwned(card) ? "✓" : ""}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          );
        })}
        {groups.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">No cards match your filters.</p>
        )}
      </div>
    </div>
  );
}
