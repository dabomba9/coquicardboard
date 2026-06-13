"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CardThumb } from "@/components/card-thumb";

export type VaultTile = {
  id: number;
  name: string | null;
  year: number | null;
  manufacturer: string | null;
  cardNumber: string | null;
  cardType: string | null;
  tier: number | null;
  frontImage: string | null;
};

type SortKey = "year" | "year_desc" | "name" | "manufacturer" | "cardType";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "year", label: "Year ↑" },
  { key: "year_desc", label: "Year ↓" },
  { key: "name", label: "Name" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "cardType", label: "Card type" },
];

const PAGE_SIZE = 48;

export function VaultExplorer({ cards }: { cards: VaultTile[] }) {
  const [q, setQ] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [cardType, setCardType] = useState("");
  const [year, setYear] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("year");
  const [page, setPage] = useState(0);

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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = cards.filter((c) => {
      if (needle && !`${c.name ?? ""} ${c.cardNumber ?? ""}`.toLowerCase().includes(needle)) return false;
      if (manufacturer && c.manufacturer !== manufacturer) return false;
      if (cardType && c.cardType !== cardType) return false;
      if (year && String(c.year) !== year) return false;
      if (hasImage && !c.frontImage) return false;
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
  }, [cards, q, manufacturer, cardType, year, hasImage, sortBy]);

  // Any filter/sort change returns to page 1 (handled in the change handlers below).
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const hasFilters = q !== "" || manufacturer !== "" || cardType !== "" || year !== "" || hasImage;
  function reset() {
    setQ(""); setManufacturer(""); setCardType(""); setYear(""); setHasImage(false); setSortBy("year"); setPage(0);
  }
  // Wrap a setter so any filter/sort change also returns to page 1.
  const onFilter = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0); };

  const selectCls =
    "h-9 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="mt-6">
      {/* Controls — modern command bar (mirrors the navbar / collection) */}
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
          <select value={manufacturer} onChange={(e) => onFilter(setManufacturer)(e.target.value)} className={selectCls} aria-label="Manufacturer">
            <option value="">All manufacturers</option>
            {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={cardType} onChange={(e) => onFilter(setCardType)(e.target.value)} className={selectCls} aria-label="Card type">
            <option value="">All types</option>
            {cardTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={year} onChange={(e) => onFilter(setYear)(e.target.value)} className={selectCls} aria-label="Year">
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
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
          {hasFilters && (
            <button onClick={reset} className="font-sans text-[9px] uppercase text-muted underline hover:text-foreground">Clear</button>
          )}
          <span className="ml-auto font-data text-sm text-muted">
            {filtered.length.toLocaleString()} cards{filtered.length ? ` · page ${safePage + 1}/${pages}` : ""}
          </span>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No cards match your filters.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {slice.map((c) => (
              <Link key={c.id} href={`/vault/${c.id}`} className="group">
                <CardThumb
                  card={{
                    name: c.name ?? "",
                    card_number: c.cardNumber,
                    year: c.year,
                    tier_id: c.tier ?? 4,
                    image_url: c.frontImage,
                    sets: c.manufacturer ? { name: c.manufacturer } : null,
                  }}
                  className="transition-transform group-hover:-translate-y-1"
                />
              </Link>
            ))}
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
