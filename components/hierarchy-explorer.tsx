"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { CardThumb } from "@/components/card-thumb";
import { Coqui } from "@/components/mascot/coqui";
import { quickAddOwned } from "@/lib/actions/holdings";
import { playConfirm, playFanfare } from "@/lib/sfx";
import { Search } from "lucide-react";
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
  defaultGroupBy = "tier",
  storageKey = "mj.hierarchy.view",
  placeholderArt,
}: {
  cards: ExplorerCard[];
  tiers: TierMeta[];
  signedIn: boolean;
  defaultGroupBy?: GroupKey;
  storageKey?: string;
  // Legend art shown behind the placeholder for cards with no verified image.
  placeholderArt?: string;
}) {
  // Catalogs without rarity tiers (e.g. Kobe's brand-grouped Mamba Origins) pass an
  // empty `tiers` array — hide the tier chips/column/option so the UI reads cleanly.
  const hasTiers = tiers.length > 0;
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState<Set<number>>(new Set());
  const [setFilter, setSetFilter] = useState("");
  const [ownership, setOwnership] = useState<Ownership>("all");
  const [forTradeOnly, setForTradeOnly] = useState(false);
  const [attrs, setAttrs] = useState<Set<Attr>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("rarity");
  const [groupBy, setGroupBy] = useState<GroupKey>(defaultGroupBy);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [ownedLocal, setOwnedLocal] = useState<Set<string>>(new Set());
  const [celebrating, setCelebrating] = useState(false);
  const [, startAdd] = useTransition();
  const router = useRouter();

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
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 1900);
        playFanfare();
      } else {
        toast.success("Added to your collection");
        playConfirm();
      }
    });
  }

  // Persist the grid/list preference.
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    // Sync the persisted preference after mount (kept out of initial state to
    // avoid an SSR/client hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "grid" || saved === "list") setView(saved);
  }, [storageKey]);
  useEffect(() => {
    localStorage.setItem(storageKey, view);
  }, [view, storageKey]);

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
      {/* Tier-complete celebration — transient bobbing Coqui */}
      {celebrating && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          <Coqui pose="celebrate" size={140} aria-label="Coqui celebrating" />
        </div>
      )}

      {/* Party status — collection progress meters; also click to filter */}
      {signedIn && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {facets.map((f, i) => {
            // Facets are [Collected, Tier1..N, Serial]; color tier meters by tier.
            const meter = i >= 1 && i <= tiers.length ? `var(--tier-${tiers[i - 1].id})` : "var(--accent)";
            return (
              <button
                key={f.label}
                onClick={f.onClick}
                className={cn(
                  "rounded-2xl border border-border/50 bg-card p-3 text-left transition-transform hover:-translate-y-0.5",
                  f.active && "border-accent"
                )}
              >
                <div className="font-sans text-[9px] uppercase tracking-wide text-muted">{f.label}</div>
                <div className="mt-1 font-data text-lg leading-none">{f.owned}/{f.total}</div>
                <div className="meter mt-2" style={{ ["--meter" as string]: meter } as React.CSSProperties}>
                  <span style={{ width: `${f.pct}%` }} />
                </div>
                <div className="mt-1 font-data text-sm text-muted">{f.pct}% complete</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Controls — modern command bar (mirrors the floating navbar) */}
      <div className="font-modern sticky top-20 z-10 mb-6 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.30)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or set…"
              className="h-9 w-full rounded-full border border-border/60 bg-foreground/[0.03] pl-9 pr-3.5 text-sm text-foreground transition-colors placeholder:text-muted hover:border-border focus:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select value={setFilter} onChange={(e) => setSetFilter(e.target.value)} className="h-9 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">All sets</option>
            {setNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={ownership} onChange={(e) => setOwnership(e.target.value as Ownership)} disabled={!signedIn} className="h-9 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
            <option value="all">All</option>
            <option value="owned">Owned</option>
            <option value="needed">Needed</option>
          </select>
          <label className={cn("flex items-center gap-1.5 text-sm text-muted", !signedIn && "opacity-50")}>
            <input type="checkbox" checked={forTradeOnly} disabled={!signedIn} onChange={(e) => setForTradeOnly(e.target.checked)} />
            For trade
          </label>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted">Sort</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="h-9 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <span className="text-muted">Group</span>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupKey)} className="h-9 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {hasTiers && <option value="tier">Tier</option>}
              <option value="set">Set</option>
            </select>
            <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-foreground/[0.03] p-0.5">
              <button onClick={() => setView("grid")} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", view === "grid" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground")}>Grid</button>
              <button onClick={() => setView("list")} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", view === "list" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground")}>List</button>
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
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active ? cn(c.text, "border-current bg-foreground/5") : "border-border/55 text-muted hover:border-border hover:text-foreground"
                )}
              >
                Tier {t.id}
              </button>
            );
          })}
          {hasTiers && <span className="mx-1 h-5 w-0.5 bg-border" />}
          {ATTRS.map((a) => {
            const active = attrs.has(a.key);
            return (
              <button
                key={a.key}
                onClick={() => toggleAttr(a.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active ? "border-[var(--gold)]/60 bg-[var(--gold)]/10 text-[var(--gold)]" : "border-border/55 text-muted hover:border-border hover:text-foreground"
                )}
              >
                {a.label}
              </button>
            );
          })}
          {(tierFilter.size > 0 || attrs.size > 0 || setFilter || forTradeOnly || ownership !== "all" || q) && (
            <button onClick={resetFilters} className="font-sans text-[9px] uppercase text-muted underline hover:text-foreground">Clear</button>
          )}
          <span className="ml-2 font-data text-sm text-muted">
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
            <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
              <h2 className="font-sans text-sm uppercase tracking-wide">{g.label}</h2>
              <span className="font-data text-base text-muted">
                {signedIn ? `${ownedN} / ${g.items.length}` : `${g.items.length}`}
              </span>
            </div>
            {signedIn && (
              <div className="meter mt-2"><span style={{ width: `${pct}%` }} /></div>
            )}

            {view === "grid" ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {g.items.map((card) => {
                  const owned = isOwned(card);
                  return (
                  <div key={card.id} className="cv-auto group relative">
                    <Link href={`/cards/${card.slug}`}>
                      <CardThumb
                        card={{
                          name: card.name,
                          card_number: card.card_number,
                          year: card.year,
                          tier_id: card.tier_id,
                          image_url: card.image_url,
                          sets: card.set_name ? { name: card.set_name } : null,
                        }}
                        placeholderArt={placeholderArt}
                        className={cn(
                          "transition-transform group-hover:-translate-y-1",
                          owned && "border-[var(--gold)]",
                          "foil foil--soft" // holographic shimmer on all four tiers
                        )}
                      />
                    </Link>
                    {owned && (
                      <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-[var(--gold)] px-1.5 text-[9px] font-semibold text-black">✓</span>
                    )}
                    {card.for_trade && (
                      <span className="pointer-events-none absolute left-1 top-1 rounded-full bg-accent px-1.5 text-[9px] font-semibold text-black">T</span>
                    )}
                    {!owned && (
                      <button
                        type="button"
                        aria-label={signedIn ? "Add to my collection" : "Sign in to add"}
                        onClick={(e) => { e.preventDefault(); if (signedIn) quickAdd(card); else router.push("/login"); }}
                        className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-black opacity-100 transition-opacity hover:brightness-110 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        title={signedIn ? "Add to my collection" : "Sign in to add"}
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
                <thead className="text-left font-sans text-[9px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 pr-2">Card</th>
                    <th className="py-2 pr-2">Set</th>
                    <th className="py-2 pr-2">Year</th>
                    <th className="py-2 pr-2">#</th>
                    {hasTiers && <th className="py-2 pr-2">Tier</th>}
                    <th className="py-2 pr-2 text-right">Value</th>
                    {signedIn && <th className="py-2 pr-2 text-center">Owned</th>}
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((card) => (
                    <tr key={card.id} className="border-t border-border/50 hover:bg-foreground/5">
                      <td className="py-2 pr-2">
                        <Link href={`/cards/${card.slug}`} className="font-medium hover:underline">{card.name}</Link>
                      </td>
                      <td className="py-2 pr-2 text-muted">{card.set_name}</td>
                      <td className="py-2 pr-2 font-data text-base text-muted">{card.year}</td>
                      <td className="py-2 pr-2 font-data text-base text-muted">{card.card_number ? `#${card.card_number}` : ""}</td>
                      {hasTiers && <td className="py-2 pr-2 font-data text-base text-muted">{card.tier_id}</td>}
                      <td className="py-2 pr-2 text-right font-num text-base">{card.value_cents ? formatUsd(card.value_cents) : "—"}</td>
                      {signedIn && <td className="py-2 pr-2 text-center text-[var(--gold)]">{isOwned(card) ? "✓" : ""}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          );
        })}
        {groups.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Coqui pose="sleeping" size={80} bob={false} aria-label="Coqui sleeping" />
            <p className="font-sans text-[10px] uppercase tracking-wide text-muted">No cards match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
