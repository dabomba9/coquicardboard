import { describe, it, expect } from "vitest";
import { computeTierSummary, type CardIndexRow } from "@/lib/summary";
import type { Holding, Tier } from "@/lib/types";

const tiers: Tier[] = [
  { id: 1, name: "Pinnacle", slug: "pinnacle", rank: 1, description: null, card_count: 2 },
  { id: 2, name: "Elite", slug: "elite", rank: 2, description: null, card_count: 3 },
];
const index: CardIndexRow[] = [
  { id: "a", tier_id: 1, catalog_value_cents: 100 },
  { id: "b", tier_id: 1, catalog_value_cents: 200 },
  { id: "c", tier_id: 2, catalog_value_cents: null },
];

function h(card_id: string, extra: Partial<Holding> = {}): Holding {
  return {
    id: Math.random().toString(36), user_id: "u", card_id,
    condition_type: "raw", grading_company: null, grade: null, cert_number: null,
    quantity: 1, purchase_price_cents: null, purchase_currency: "USD",
    acquired_at: null, for_trade: false, is_public: true, notes: null, ...extra,
  };
}

describe("computeTierSummary", () => {
  it("counts distinct owned cards per tier (multiple copies = 1 owned)", () => {
    const s = computeTierSummary(tiers, [h("a"), h("a"), h("b")], index, new Map());
    const t1 = s.find((x) => x.tier_id === 1)!;
    expect(t1.owned_cards).toBe(2);
    expect(t1.total_cards).toBe(2);
  });

  it("prefers grade-matched price, then raw, then catalog value", () => {
    const prices = new Map<string, number>([
      ["a|PSA10", 5000], ["a|raw", 1000], ["b|raw", 300],
    ]);
    const s = computeTierSummary(
      tiers,
      [h("a", { condition_type: "graded", grading_company: "PSA", grade: 10 }), h("b")],
      index, prices
    );
    // a → PSA10 5000, b → raw 300
    expect(s.find((x) => x.tier_id === 1)!.est_value_cents).toBe(5300);
  });

  it("falls back to catalog_value_cents when no price", () => {
    const s = computeTierSummary(tiers, [h("a")], index, new Map());
    expect(s.find((x) => x.tier_id === 1)!.est_value_cents).toBe(100); // catalog value
  });

  it("multiplies by quantity", () => {
    const prices = new Map([["c|raw", 500]]);
    const s = computeTierSummary(tiers, [h("c", { quantity: 3 })], index, prices);
    expect(s.find((x) => x.tier_id === 2)!.est_value_cents).toBe(1500);
  });

  it("zero owned for empty holdings, totals intact", () => {
    const s = computeTierSummary(tiers, [], index, new Map());
    expect(s.map((x) => x.owned_cards)).toEqual([0, 0]);
    expect(s.find((x) => x.tier_id === 2)!.total_cards).toBe(3);
  });
});
