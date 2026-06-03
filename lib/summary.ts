import type { Holding, Tier, TierSummary } from "@/lib/types";

export type CardIndexRow = { id: string; tier_id: number; catalog_value_cents: number | null };

// Pure per-tier rollup from the catalog + a user's holdings + a price map
// (keyed "cardId|gradeKey"). Owned = distinct cards with ≥1 holding; value uses
// the best grade-matched price, falling back to raw then catalog value.
export function computeTierSummary(
  tiers: Tier[],
  holdings: Holding[],
  cardIndex: CardIndexRow[],
  priceMap: Map<string, number>
): TierSummary[] {
  const tierOf = new Map(cardIndex.map((c) => [c.id, c.tier_id]));
  const baseValue = new Map(cardIndex.map((c) => [c.id, c.catalog_value_cents ?? 0]));
  const ownedByTier = new Map<number, Set<string>>();
  const valueByTier = new Map<number, number>();

  for (const h of holdings) {
    const tier = tierOf.get(h.card_id);
    if (tier == null) continue;
    (ownedByTier.get(tier) ?? ownedByTier.set(tier, new Set()).get(tier)!).add(h.card_id);
    const gk =
      h.condition_type === "graded" && h.grading_company && h.grade != null
        ? `${h.grading_company}${h.grade}`
        : "raw";
    const unit =
      priceMap.get(`${h.card_id}|${gk}`) ??
      priceMap.get(`${h.card_id}|raw`) ??
      baseValue.get(h.card_id) ??
      0;
    valueByTier.set(tier, (valueByTier.get(tier) ?? 0) + unit * Math.max(h.quantity, 1));
  }

  return tiers.map((t) => ({
    tier_id: t.id,
    tier_name: t.name,
    tier_rank: t.rank,
    total_cards: t.card_count,
    owned_cards: ownedByTier.get(t.id)?.size ?? 0,
    est_value_cents: valueByTier.get(t.id) ?? 0,
  }));
}
