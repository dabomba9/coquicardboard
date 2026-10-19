// Pure helpers for the want list — "deal" detection (current price at/below the
// user's target) and a comparator for the "Best deal" sort.

export type Dealable = { current_cents: number | null; target_cents: number | null };

/** True when we have both a current value and a target, and current is at/below it. */
export function isDeal(current: number | null, target: number | null): boolean {
  return current != null && target != null && current <= target;
}

/**
 * "Best deal" comparator: under-target items first (cheapest current first), then
 * everything else (also cheapest current first; unknown current last).
 */
export function wantSort(a: Dealable, b: Dealable): number {
  const ad = isDeal(a.current_cents, a.target_cents);
  const bd = isDeal(b.current_cents, b.target_cents);
  if (ad !== bd) return ad ? -1 : 1;
  const ac = a.current_cents ?? Infinity;
  const bc = b.current_cents ?? Infinity;
  return ac - bc;
}

// Grouping for the "Catalog" sort. The want list spans every catalog, so it groups
// by catalog rather than MJ tier: vault cards have no tier (null), and Kobe/Mamba
// tier ids are cosmetic, so tier grouping filed them under "Tier null" or under
// MJ tier names.
export type Groupable = { catalog: string; tier_id: number | null; rarity_rank: number };

/** Within a catalog: tier first (tier-less cards last), then rarity rank. */
export function tierThenRank(a: Groupable, b: Groupable): number {
  return (a.tier_id ?? 99) - (b.tier_id ?? 99) || a.rarity_rank - b.rarity_rank;
}

/** Split into catalog groups, ordered by `order(slug)`, each sorted by tierThenRank. */
export function groupByCatalog<T extends Groupable>(
  items: T[],
  order: (slug: string) => number
): { catalog: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const c of items) {
    const list = map.get(c.catalog);
    if (list) list.push(c);
    else map.set(c.catalog, [c]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([catalog, list]) => ({ catalog, items: [...list].sort(tierThenRank) }));
}
