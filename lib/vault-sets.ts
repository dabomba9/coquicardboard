// Group a vault's cards into sets, for the /sets/<catalog>/<set> checklist pages.
// A vault card's set is its name before " #<number>" (vaultSetName). Pure, so the
// grouping and slugs are unit-tested; lib/queries.ts feeds it the cached catalog.
import { vaultSetName } from "@/lib/card-about";

export type SetCard = {
  id: string;
  slug: string;
  name: string | null;
  card_number: string | null;
  year: number | null;
  image_url: string | null;
};

export type VaultSet<C extends SetCard = SetCard> = {
  name: string;
  slug: string;
  cards: C[]; // in checklist order (card number)
  yearFrom: number | null;
  yearTo: number | null;
  imaged: number;
};

/** URL slug for a set name: "1998 Upper Deck - Living Legend" → "1998-upper-deck-living-legend". */
export function setSlug(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Checklist order: numeric part first ("#2" before "#10"), then the rest as text.
function numberKey(n: string | null): [number, string] {
  const s = (n ?? "").replace(/^#+/, "");
  const m = /\d+/.exec(s);
  return [m ? Number(m[0]) : Number.MAX_SAFE_INTEGER, s];
}

export function groupVaultSets<C extends SetCard>(cards: C[]): VaultSet<C>[] {
  const by = new Map<string, C[]>();
  for (const c of cards) {
    const name = c.name ? vaultSetName(c.name) : null;
    if (!name) continue;
    const list = by.get(name);
    if (list) list.push(c); else by.set(name, [c]);
  }
  const out: VaultSet<C>[] = [];
  for (const [name, list] of by) {
    list.sort((a, b) => {
      const [an, as] = numberKey(a.card_number), [bn, bs] = numberKey(b.card_number);
      return an - bn || as.localeCompare(bs);
    });
    const years = list.map((c) => c.year).filter((y): y is number => y != null);
    out.push({
      name,
      slug: setSlug(name),
      cards: list,
      yearFrom: years.length ? Math.min(...years) : null,
      yearTo: years.length ? Math.max(...years) : null,
      imaged: list.filter((c) => c.image_url).length,
    });
  }
  return out.sort((a, b) => (a.yearFrom ?? 0) - (b.yearFrom ?? 0) || a.name.localeCompare(b.name));
}

/** Worth its own indexable page: a real checklist (3+ cards) with something to show. */
export function isSetPageWorthy(s: Pick<VaultSet, "cards" | "imaged">, pricedCount = 0): boolean {
  return s.cards.length >= 3 && (s.imaged > 0 || pricedCount > 0);
}

/** Sets grouped by the decade they were issued in ("1990s"), oldest first; undated last. */
export function setsByDecade<S extends Pick<VaultSet, "yearFrom" | "name">>(sets: S[]): { decade: string; sets: S[] }[] {
  const by = new Map<string, S[]>();
  for (const s of sets) {
    const key = s.yearFrom == null ? "Undated" : `${Math.floor(s.yearFrom / 10) * 10}s`;
    const list = by.get(key);
    if (list) list.push(s); else by.set(key, [s]);
  }
  return [...by.entries()]
    .sort(([a], [b]) => (a === "Undated" ? 1 : b === "Undated" ? -1 : a.localeCompare(b)))
    .map(([decade, list]) => ({ decade, sets: list.sort((x, y) => (x.yearFrom ?? 0) - (y.yearFrom ?? 0) || x.name.localeCompare(y.name)) }));
}
