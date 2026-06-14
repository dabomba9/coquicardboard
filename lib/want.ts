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
