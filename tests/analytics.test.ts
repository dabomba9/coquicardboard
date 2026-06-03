import { describe, it, expect } from "vitest";
import {
  valueByGroup, biggestMovers, rarityHighlights, holdingValue,
  type OwnedCardMeta, type PriceHistoryRow,
} from "@/lib/analytics";
import type { Holding } from "@/lib/types";

function h(card_id: string, extra: Partial<Holding> = {}): Holding {
  return {
    id: "h" + Math.random(), user_id: "u", card_id,
    condition_type: "raw", grading_company: null, grade: null, cert_number: null,
    quantity: 1, purchase_price_cents: null, purchase_currency: "USD",
    acquired_at: null, for_trade: false, is_public: true, notes: null, ...extra,
  };
}
function m(id: string, extra: Partial<OwnedCardMeta> = {}): OwnedCardMeta {
  return { id, name: `Card ${id}`, slug: id, tier_id: 1, set_name: "Set A",
    print_run: null, serial_numbered: false, catalog_value_cents: 0, ...extra };
}

const meta = new Map<string, OwnedCardMeta>([
  ["a", m("a", { tier_id: 1, set_name: "1997 Metal", print_run: 10, serial_numbered: true })],
  ["b", m("b", { tier_id: 2, set_name: "1986 Fleer", catalog_value_cents: 300 })],
]);
const prices = new Map<string, number>([["a|PSA10", 5000], ["a|raw", 1000], ["b|raw", 200]]);

describe("holdingValue", () => {
  it("grade-match → raw → catalog fallback, × qty", () => {
    expect(holdingValue(h("a", { condition_type: "graded", grading_company: "PSA", grade: 10 }), prices, meta)).toBe(5000);
    expect(holdingValue(h("a", { quantity: 2 }), prices, meta)).toBe(2000); // raw 1000 × 2
    expect(holdingValue(h("b", {}), new Map(), meta)).toBe(300); // catalog fallback
  });
});

describe("valueByGroup", () => {
  it("groups by tier with value + distinct count, sorted desc", () => {
    const rows = valueByGroup([h("a"), h("a"), h("b")], meta, prices, "tier");
    // two raw copies of "a" → 2× value, but 1 distinct card
    expect(rows[0]).toMatchObject({ label: "Tier 1", value: 2000, count: 1 });
    expect(rows.find((r) => r.label === "Tier 2")).toMatchObject({ value: 200, count: 1 });
  });
  it("groups by grade", () => {
    const rows = valueByGroup(
      [h("a", { condition_type: "graded", grading_company: "PSA", grade: 10 }), h("b")],
      meta, prices, "grade"
    );
    expect(rows.find((r) => r.label === "PSA 10")?.value).toBe(5000);
    expect(rows.find((r) => r.label === "Raw")?.value).toBe(200);
  });
});

describe("biggestMovers", () => {
  const rows: PriceHistoryRow[] = [
    { card_id: "a", grade_key: "raw", value_cents: 100, recorded_on: "2025-01-01" },
    { card_id: "a", grade_key: "raw", value_cents: 200, recorded_on: "2025-06-01" }, // +100%
    { card_id: "b", grade_key: "raw", value_cents: 400, recorded_on: "2025-01-01" },
    { card_id: "b", grade_key: "raw", value_cents: 300, recorded_on: "2025-06-01" }, // -25%
  ];
  it("computes gainers and losers", () => {
    const { gainers, losers } = biggestMovers([h("a"), h("b")], meta, rows);
    expect(gainers[0]).toMatchObject({ cardId: "a" });
    expect(gainers[0].pct).toBeCloseTo(1.0);
    expect(losers[0]).toMatchObject({ cardId: "b" });
    expect(losers[0].pct).toBeCloseTo(-0.25);
  });
});

describe("rarityHighlights", () => {
  it("counts serial-numbered and lists lowest print runs", () => {
    const r = rarityHighlights([h("a"), h("b")], meta);
    expect(r.ownedCount).toBe(2);
    expect(r.serialOwned).toBe(1);
    expect(r.lowestPrints[0]).toMatchObject({ slug: "a", print_run: 10 });
  });
});
