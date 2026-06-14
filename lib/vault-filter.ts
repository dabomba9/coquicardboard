// Pure, server-side filter/sort/paginate + facet helpers for the Jordan Vault.
// The full catalog (~12k slim rows) is cached (getVaultCatalog); these run over it
// in-memory per request so the browser only receives one page (PAGE_SIZE) of cards.
import type { VaultRow } from "@/lib/queries";

export const PAGE_SIZE = 48;

export type SortKey = "year" | "year_desc" | "name" | "manufacturer" | "cardType";
export type Ownership = "all" | "owned" | "needed";

export type VaultParams = {
  q: string;
  manufacturer: string;
  cardType: string;
  year: string;
  hasImage: boolean;
  ownership: Ownership;
  sort: SortKey;
  page: number;
};

export type VaultItem = {
  id: string;
  slug: string;
  name: string | null;
  year: number | null;
  manufacturer: string | null;
  cardNumber: string | null;
  cardType: string | null;
  frontImage: string | null;
};

const attrStr = (row: VaultRow, key: string): string | null => {
  const v = row.attributes?.[key];
  return typeof v === "string" ? v : null;
};

export function toItem(row: VaultRow): VaultItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    year: row.year,
    manufacturer: attrStr(row, "manufacturer"),
    cardNumber: row.card_number,
    cardType: attrStr(row, "cardType"),
    frontImage: row.image_url,
  };
}

/** Parse raw URL searchParams into a normalized VaultParams. */
export function parseVaultParams(sp: Record<string, string | string[] | undefined>): VaultParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? "";
  const sorts: SortKey[] = ["year", "year_desc", "name", "manufacturer", "cardType"];
  const sortRaw = one("sort") as SortKey;
  const ownRaw = one("ownership") as Ownership;
  const pageNum = parseInt(one("page"), 10);
  return {
    q: one("q"),
    manufacturer: one("manufacturer"),
    cardType: one("type"),
    year: one("year"),
    hasImage: one("img") === "1",
    ownership: (["all", "owned", "needed"] as Ownership[]).includes(ownRaw) ? ownRaw : "all",
    sort: sorts.includes(sortRaw) ? sortRaw : "year",
    page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1,
  };
}

/** Distinct dropdown options, derived from the catalog only (user-independent). */
export function vaultFilterOptions(rows: VaultRow[]): {
  manufacturers: string[];
  cardTypes: string[];
  years: number[];
} {
  const man = new Set<string>();
  const types = new Set<string>();
  const years = new Set<number>();
  for (const r of rows) {
    const m = attrStr(r, "manufacturer");
    if (m) man.add(m);
    const t = attrStr(r, "cardType");
    if (t) types.add(t);
    if (r.year != null) years.add(r.year);
  }
  return {
    manufacturers: [...man].sort(),
    cardTypes: [...types].sort(),
    years: [...years].sort((a, b) => a - b),
  };
}

export type Facet = { label: string; manufacturer: string; owned: number; total: number; pct: number };

/** Overall + per-manufacturer collection progress (owned/total), scoped to ownedIds. */
export function vaultFacets(rows: VaultRow[], ownedIds: Set<string>): Facet[] {
  const byMan = new Map<string, { owned: number; total: number }>();
  let allOwned = 0;
  for (const r of rows) {
    const owned = ownedIds.has(r.id);
    if (owned) allOwned++;
    const m = attrStr(r, "manufacturer");
    if (!m) continue;
    const cur = byMan.get(m) ?? { owned: 0, total: 0 };
    cur.total++;
    if (owned) cur.owned++;
    byMan.set(m, cur);
  }
  const pct = (o: number, t: number) => (t ? Math.round((o / t) * 100) : 0);
  const overall: Facet = { label: "Collected", manufacturer: "", owned: allOwned, total: rows.length, pct: pct(allOwned, rows.length) };
  const perMan = [...byMan.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, v]) => ({ label: m, manufacturer: m, owned: v.owned, total: v.total, pct: pct(v.owned, v.total) }));
  return [overall, ...perMan];
}

/** Filter + sort + paginate. Returns the requested page plus the full filtered total. */
export function filterSortVault(
  rows: VaultRow[],
  params: VaultParams,
  ownedIds: Set<string>
): { items: VaultItem[]; total: number; pages: number; page: number } {
  const needle = params.q.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (needle && !`${r.name ?? ""} ${r.card_number ?? ""}`.toLowerCase().includes(needle)) return false;
    if (params.manufacturer && attrStr(r, "manufacturer") !== params.manufacturer) return false;
    if (params.cardType && attrStr(r, "cardType") !== params.cardType) return false;
    if (params.year && String(r.year) !== params.year) return false;
    if (params.hasImage && !r.image_url) return false;
    const owned = ownedIds.has(r.id);
    if (params.ownership === "owned" && !owned) return false;
    if (params.ownership === "needed" && owned) return false;
    return true;
  });

  const byName = (a: VaultRow, b: VaultRow) => (a.name ?? "").localeCompare(b.name ?? "");
  const cmp: Record<SortKey, (a: VaultRow, b: VaultRow) => number> = {
    year: (a, b) => (a.year ?? 0) - (b.year ?? 0) || byName(a, b),
    year_desc: (a, b) => (b.year ?? 0) - (a.year ?? 0) || byName(a, b),
    name: byName,
    manufacturer: (a, b) => (attrStr(a, "manufacturer") ?? "").localeCompare(attrStr(b, "manufacturer") ?? "") || byName(a, b),
    cardType: (a, b) => (attrStr(a, "cardType") ?? "").localeCompare(attrStr(b, "cardType") ?? "") || byName(a, b),
  };
  filtered.sort(cmp[params.sort]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page), pages);
  const start = (page - 1) * PAGE_SIZE;
  return { items: filtered.slice(start, start + PAGE_SIZE).map(toItem), total, pages, page };
}
