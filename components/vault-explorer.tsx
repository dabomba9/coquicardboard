"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { CardThumb } from "@/components/card-thumb";
import { quickAddOwned } from "@/lib/actions/holdings";
import { playConfirm } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import type { VaultItem, VaultParams, SortKey, Facet } from "@/lib/vault-filter";

export type VaultTile = VaultItem & { owned: boolean; forTrade: boolean };

const SORTS: { key: SortKey; label: string }[] = [
  { key: "year", label: "Year ↑" },
  { key: "year_desc", label: "Year ↓" },
  { key: "name", label: "Name" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "cardType", label: "Card type" },
];
// Vault has no tiers; cycle a palette so each manufacturer facet reads distinctly.
const METER_VARS = ["var(--tier-1)", "var(--tier-2)", "var(--tier-3)", "var(--tier-4)", "var(--accent)", "var(--gold)"];

type Props = {
  tiles: VaultTile[];
  params: VaultParams;
  options: { manufacturers: string[]; cardTypes: string[]; years: number[] };
  facets: Facet[];
  total: number;
  pages: number;
  page: number;
  signedIn: boolean;
  ownedCount: number;
  // Legend art shown behind the placeholder for cards with no verified image.
  placeholderArt?: string;
};

export function VaultExplorer({ tiles, params, options, facets, total, pages, page, signedIn, ownedCount, placeholderArt }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [text, setText] = useState(params.q);
  const [ownedLocal, setOwnedLocal] = useState<Set<string>>(new Set());
  const [, startAdd] = useTransition();

  const isOwned = (t: VaultTile) => t.owned || ownedLocal.has(t.id);

  // Build a URL from the current params with `overrides` applied. Any non-page
  // change resets to page 1; empty/default values drop the key.
  function hrefWith(overrides: Record<string, string | null>): string {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in overrides)) next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }
  const navigate = (overrides: Record<string, string | null>) =>
    router.replace(hrefWith(overrides), { scroll: false });

  // Debounced free-text search → URL.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const id = setTimeout(() => {
      if (text.trim() !== params.q) router.replace(hrefWith({ q: text.trim() || null }), { scroll: false });
    }, 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  // Keep the box in sync if params change externally (e.g. Clear / back button).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setText(params.q); }, [params.q]);

  function quickAdd(e: React.MouseEvent, t: VaultTile) {
    e.preventDefault(); e.stopPropagation();
    if (isOwned(t)) return;
    startAdd(async () => {
      const res = await quickAddOwned(t.id);
      if (res?.error) { toast.error(res.error); return; }
      setOwnedLocal((prev) => new Set(prev).add(t.id));
      toast.success("Added to your collection");
      playConfirm();
    });
  }

  const selectCls =
    "h-9 rounded-full border border-border/60 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
  const hasFilters =
    params.q !== "" || params.manufacturer !== "" || params.cardType !== "" || params.year !== "" ||
    params.hasImage || params.ownership !== "all";

  return (
    <div className="mt-6">
      {/* Progress facets — overall + per-manufacturer collection meters (click to filter) */}
      {signedIn && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {facets.map((f, i) => (
            <button
              key={f.label}
              onClick={() => navigate({ manufacturer: params.manufacturer === f.manufacturer ? null : f.manufacturer || null })}
              className={cn(
                "rounded-2xl border border-border/50 bg-card p-3 text-left transition-transform hover:-translate-y-0.5",
                params.manufacturer === f.manufacturer && f.manufacturer !== "" && "border-accent"
              )}
            >
              <div className="truncate font-sans text-[9px] uppercase tracking-wide text-muted">{f.label}</div>
              <div className="mt-1 font-data text-base leading-none">{f.owned}/{f.total}</div>
              <div className="meter mt-2" style={{ ["--meter" as string]: f.label === "Collected" ? "var(--accent)" : METER_VARS[i % METER_VARS.length] } as React.CSSProperties}>
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
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search name or card number…"
              className="h-9 w-full rounded-full border border-border/60 bg-foreground/[0.03] pl-9 pr-3.5 text-sm text-foreground transition-colors placeholder:text-muted hover:border-border focus:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select value={params.cardType} onChange={(e) => navigate({ type: e.target.value || null })} className={selectCls} aria-label="Card type">
            <option value="">All types</option>
            {options.cardTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={params.year} onChange={(e) => navigate({ year: e.target.value || null })} className={selectCls} aria-label="Year">
            <option value="">All years</option>
            {options.years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <select value={params.ownership} onChange={(e) => navigate({ ownership: e.target.value === "all" ? null : e.target.value })} disabled={!signedIn} className={selectCls} aria-label="Ownership">
            <option value="all">All</option>
            <option value="owned">Owned</option>
            <option value="needed">Needed</option>
          </select>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5 text-muted"><input type="checkbox" checked={params.hasImage} onChange={(e) => navigate({ img: e.target.checked ? "1" : null })} /> Has image</label>
            <span className="text-muted">Sort</span>
            <select value={params.sort} onChange={(e) => navigate({ sort: e.target.value === "year" ? null : e.target.value })} className={selectCls}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {params.manufacturer && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{params.manufacturer}</span>
          )}
          {hasFilters && (
            <Link href={pathname} replace scroll={false} className="font-sans text-[9px] uppercase text-muted underline hover:text-foreground">Clear</Link>
          )}
          <span className="ml-auto font-data text-sm text-muted">
            {total.toLocaleString()} cards{signedIn ? ` · ${ownedCount.toLocaleString()} owned` : ""}
          </span>
        </div>
      </div>

      {/* Results */}
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No cards match your filters.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {tiles.map((c, i) => {
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
                    placeholderArt={placeholderArt}
                    priority={i === 0}
                    className="transition-transform group-hover:-translate-y-1"
                  />
                  {owned && (
                    <span className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--gold)] text-black"><Check size={12} /></span>
                  )}
                  {c.forTrade && (
                    <span className="pointer-events-none absolute left-1 top-1 rounded-full bg-accent px-1.5 text-[9px] font-bold uppercase text-black">T</span>
                  )}
                  {!owned && (
                    <button
                      aria-label={signedIn ? "Add to my collection" : "Sign in to add"}
                      onClick={(e) => { if (signedIn) { quickAdd(e, c); } else { e.preventDefault(); e.stopPropagation(); router.push("/login"); } }}
                      title={signedIn ? "Add to my collection" : "Sign in to add"}
                      className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/85 text-muted backdrop-blur transition-opacity hover:text-accent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    >
                      <Plus size={15} />
                    </button>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            {page > 1 ? (
              <Link href={hrefWith({ page: String(page - 1) })} scroll className="rounded-full border border-border/60 px-4 py-1.5 text-sm text-muted transition-colors hover:border-border hover:text-foreground">‹ Prev</Link>
            ) : (
              <span className="rounded-full border border-border/60 px-4 py-1.5 text-sm text-muted opacity-40">‹ Prev</span>
            )}
            <span className="font-data text-sm text-muted">Page {page} of {pages}</span>
            {page < pages ? (
              <Link href={hrefWith({ page: String(page + 1) })} scroll className="rounded-full border border-border/60 px-4 py-1.5 text-sm text-muted transition-colors hover:border-border hover:text-foreground">Next ›</Link>
            ) : (
              <span className="rounded-full border border-border/60 px-4 py-1.5 text-sm text-muted opacity-40">Next ›</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
