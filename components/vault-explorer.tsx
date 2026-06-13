"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { CardThumb } from "@/components/card-thumb";
import { quickAddOwned } from "@/lib/actions/holdings";
import { playConfirm } from "@/lib/sfx";
import { cn } from "@/lib/utils";

export type VaultTile = {
  id: string;
  slug: string;
  name: string | null;
  year: number | null;
  manufacturer: string | null;
  cardNumber: string | null;
  cardType: string | null;
  frontImage: string | null;
  owned: boolean;
  forTrade: boolean;
};

type SortKey = "year" | "year_desc" | "name" | "manufacturer" | "cardType";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "year", label: "Year ↑" },
  { key: "year_desc", label: "Year ↓" },
  { key: "name", label: "Name" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "cardType", label: "Card type" },
];
type Ownership = "all" | "owned" | "needed";
const PAGE_SIZE = 48;
// Vault has no tiers; cycle a palette so each manufacturer facet reads distinctly.
const METER_VARS = ["var(--tier-1)", "var(--tier-2)", "var(--tier-3)", "var(--tier-4)", "var(--accent)", "var(--gold)"];

export function VaultExplorer({ cards, signedIn, ownedCount }: { cards: VaultTile[]; signedIn: boolean; ownedCount: number }) {
  const [q, setQ] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [cardType, setCardType] = useState("");
  const [year, setYear] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [ownership, setOwnership] = useState<Ownership>("all");
  const [sortBy, setSortBy] = useState<SortKey>("year");
  const [page, setPage] = useState(0);
  const [ownedLocal, setOwnedLocal] = useState<Set<string>>(new Set());
  const [, startAdd] = useTransition();

  const isOwned = (c: VaultTile) => c.owned || ownedLocal.has(c.id);

  const manufacturers = useMemo(
    () => [...new Set(cards.map((c) => c.manufacturer).filter((v): v is string => v != null))].sort(),
    [cards]
  );
  const cardTypes = useMemo(
    () => [...new Set(cards.map((c) => c.cardType).filter((v): v is string => v != null))].sort(),
    [cards]
  );
  const years = useMemo(
    () => [...new Set(cards.map((c) => c.year).filter((v): v is number => v != null))].sort((a, b) => a - b),
    [cards]
  );

  // Progress facets: overall + per-manufacturer (owned/total), independent of filters.
  const progress = (subset: VaultTile[]) => {
    const total = subset.length;
    const owned = subset.filter(isOwned).length;
    return { owned, total, pct: total ? Math.round((owned / total) * 100) : 0 };
  };
  const facets = useMemo(() => {
    const byMan = new Map<string, VaultTile[]>();
    for (const c of cards) {
      if (!c.manufacturer) continue;
      (byMan.get(c.manufacturer) ?? byMan.set(c.manufacturer, []).get(c.manufacturer)!).push(c);
    }
    return [
      { label: "Collected", manufacturer: "", ...progress(cards), meter: "var(--accent)" },
      ...manufacturers.map((m, i) => ({ label: m, manufacturer: m, ...progress(byMan.get(m) ?? []), meter: METER_VARS[i % METER_VARS.length] })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, manufacturers, ownedLocal]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = cards.filter((c) => {
      if (needle && !`${c.name ?? ""} ${c.cardNumber ?? ""}`.toLowerCase().includes(needle)) return false;
      if (manufacturer && c.manufacturer !== manufacturer) return false;
      if (cardType && c.cardType !== cardType) return false;
      if (year && String(c.year) !== year) return false;
      if (hasImage && !c.frontImage) return false;
      if (ownership === "owned" && !isOwned(c)) return false;
      if (ownership === "needed" && isOwned(c)) return false;
      return true;
    });
    const byName = (a: VaultTile, b: VaultTile) => (a.name ?? "").localeCompare(b.name ?? "");
    const cmp: Record<SortKey, (a: VaultTile, b: VaultTile) => number> = {
      year: (a, b) => (a.year ?? 0) - (b.year ?? 0) || byName(a, b),
      year_desc: (a, b) => (b.year ?? 0) - (a.year ?? 0) || byName(a, b),
      name: byName,
      manufacturer: (a, b) => (a.manufacturer ?? "").localeCompare(b.manufacturer ?? "") || byName(a, b),
      cardType: (a, b) => (a.cardType ?? "").localeCompare(b.cardType ?? "") || byName(a, b),
    };
    return out.sort(cmp[sortBy]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, q, manufacturer, cardType, year, hasImage, ownership, sortBy, ownedLocal]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const hasFilters = q !== "" || manufacturer !== "" || cardType !== "" || year !== "" || hasImage || ownership !== "all";
  function reset() {
    setQ(""); setManufacturer(""); setCardType(""); setYear(""); setHasImage(false); setOwnership("all"); setSortBy("year"); setPage(0);
  }
  const onFilter = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0); };

  function quickAdd(e: React.MouseEvent, c: VaultTile) {
    e.preventDefault(); e.stopPropagation();
    if (isOwned(c)) return;
    startAdd(async () => {
      const res = await quickAddOwned(c.id);
      if (res?.error) { toast.error(res.error); return; }
      setOwnedLocal((prev) => new Set(prev).add(c.id));
      toast.success("Added to your collection");
      playConfirm();
    });
  }

  const selectCls =
    "h-9 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <div className="mt-6">
      {/* Progress facets — overall + per-manufacturer collection meters (click to filter) */}
      {signedIn && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {facets.map((f) => (
            <button
              key={f.label}
              onClick={() => { setManufacturer((m) => (m === f.manufacturer ? "" : f.manufacturer)); setPage(0); }}
              className={cn(
                "rounded-2xl border border-border/50 bg-card p-3 text-left transition-transform hover:-translate-y-0.5",
                manufacturer === f.manufacturer && f.manufacturer !== "" && "border-accent"
              )}
            >
              <div className="truncate font-sans text-[9px] uppercase tracking-wide text-muted">{f.label}</div>
              <div className="mt-1 font-data text-base leading-none">{f.owned}/{f.total}</div>
              <div className="meter mt-2" style={{ ["--meter" as string]: f.meter } as React.CSSProperties}>
                <span style={{ width: `${f.pct}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Controls — modern command bar */}
      <div className="font-modern sticky top-20 z-10 mb-6 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.30)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => onFilter(setQ)(e.target.value)}
              placeholder="Search name or card number…"
              className="h-9 w-full rounded-full border border-border/60 bg-foreground/[0.03] pl-9 pr-3.5 text-sm text-foreground transition-colors placeholder:text-muted hover:border-border focus:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select value={cardType} onChange={(e) => onFilter(setCardType)(e.target.value)} className={selectCls} aria-label="Card type">
            <option value="">All types</option>
            {cardTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={year} onChange={(e) => onFilter(setYear)(e.target.value)} className={selectCls} aria-label="Year">
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <select value={ownership} onChange={(e) => onFilter(setOwnership)(e.target.value as Ownership)} disabled={!signedIn} className={selectCls} aria-label="Ownership">
            <option value="all">All</option>
            <option value="owned">Owned</option>
            <option value="needed">Needed</option>
          </select>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5 text-muted"><input type="checkbox" checked={hasImage} onChange={(e) => onFilter(setHasImage)(e.target.checked)} /> Has image</label>
            <span className="text-muted">Sort</span>
            <select value={sortBy} onChange={(e) => onFilter(setSortBy)(e.target.value as SortKey)} className={selectCls}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {manufacturer && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{manufacturer}</span>
          )}
          {hasFilters && (
            <button onClick={reset} className="font-sans text-[9px] uppercase text-muted underline hover:text-foreground">Clear</button>
          )}
          <span className="ml-auto font-data text-sm text-muted">
            {filtered.length.toLocaleString()} cards{signedIn ? ` · ${ownedCount.toLocaleString()} owned` : ""}
          </span>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No cards match your filters.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {slice.map((c) => {
              const owned = isOwned(c);
              return (
                <Link key={c.id} href={`/cards/${c.slug}`} className="group relative">
                  <CardThumb
                    card={{
                      name: c.name ?? "",
                      card_number: c.cardNumber,
                      year: c.year,
                      tier_id: 4,
                      image_url: c.frontImage,
                      sets: c.manufacturer ? { name: c.manufacturer } : null,
                    }}
                    className="transition-transform group-hover:-translate-y-1"
                  />
                  {owned && (
                    <span className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--gold)] text-black"><Check size={12} /></span>
                  )}
                  {c.forTrade && (
                    <span className="pointer-events-none absolute left-1 top-1 rounded-full bg-accent px-1.5 text-[9px] font-bold uppercase text-black">T</span>
                  )}
                  {signedIn && !owned && (
                    <button
                      onClick={(e) => quickAdd(e, c)}
                      title="Add to my collection"
                      className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/85 text-muted opacity-0 backdrop-blur transition-opacity hover:text-accent group-hover:opacity-100 focus:opacity-100"
                    >
                      <Plus size={15} />
                    </button>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-full border border-border/60 px-4 py-1.5 text-sm text-muted transition-colors hover:border-border hover:text-foreground disabled:opacity-40"
            >‹ Prev</button>
            <span className="font-data text-sm text-muted">Page {safePage + 1} of {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={safePage >= pages - 1}
              className="rounded-full border border-border/60 px-4 py-1.5 text-sm text-muted transition-colors hover:border-border hover:text-foreground disabled:opacity-40"
            >Next ›</button>
          </div>
        </>
      )}
    </div>
  );
}
