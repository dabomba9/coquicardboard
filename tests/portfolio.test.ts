import { describe, it, expect } from "vitest";
import { valuePortfolioSeries, type PriceHistoryRow } from "@/lib/portfolio";
import type { Holding } from "@/lib/types";

function h(card_id: string, extra: Partial<Holding> = {}): Holding {
  return {
    id: "h", user_id: "u", card_id,
    condition_type: "raw", grading_company: null, grade: null, cert_number: null,
    quantity: 1, purchase_price_cents: null, purchase_currency: "USD",
    acquired_at: null, for_trade: false, is_public: true, notes: null, ...extra,
  };
}

const rows: PriceHistoryRow[] = [
  { card_id: "a", grade_key: "raw", value_cents: 100, recorded_on: "2026-01-01" },
  { card_id: "a", grade_key: "raw", value_cents: 200, recorded_on: "2026-02-01" },
  { card_id: "a", grade_key: "PSA10", value_cents: 1000, recorded_on: "2026-01-01" },
  { card_id: "a", grade_key: "PSA10", value_cents: 2000, recorded_on: "2026-02-01" },
];

describe("valuePortfolioSeries", () => {
  it("returns sorted dates with summed value", () => {
    const s = valuePortfolioSeries([h("a")], rows);
    expect(s.map((p) => p.date)).toEqual(["2026-01-01", "2026-02-01"]);
    expect(s.map((p) => p.value)).toEqual([100, 200]);
  });

  it("uses grade-matched series for graded holdings", () => {
    const s = valuePortfolioSeries(
      [h("a", { condition_type: "graded", grading_company: "PSA", grade: 10 })],
      rows
    );
    expect(s.map((p) => p.value)).toEqual([1000, 2000]);
  });

  it("falls back to raw when grade series missing", () => {
    const s = valuePortfolioSeries(
      [h("a", { condition_type: "graded", grading_company: "BGS", grade: 9.5 })],
      rows
    );
    expect(s.map((p) => p.value)).toEqual([100, 200]); // BGS9.5 absent → raw
  });

  it("multiplies by quantity and sums across holdings", () => {
    const s = valuePortfolioSeries([h("a", { quantity: 2 }), h("a")], rows);
    expect(s.map((p) => p.value)).toEqual([300, 600]); // 100*2 + 100*1
  });

  it("empty when no holdings", () => {
    expect(valuePortfolioSeries([], rows)).toEqual([]);
  });
});
