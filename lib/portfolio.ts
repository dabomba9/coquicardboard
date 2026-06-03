import type { Holding } from "@/lib/types";

export type PriceHistoryRow = {
  card_id: string;
  grade_key: string;
  value_cents: number;
  recorded_on: string;
};

function holdingGradeKey(h: Pick<Holding, "condition_type" | "grading_company" | "grade">): string {
  return h.condition_type === "graded" && h.grading_company && h.grade != null
    ? `${h.grading_company}${h.grade}`
    : "raw";
}

// Pure valuation: value the given (current) holdings at each historical month
// present in `rows`. Matches a holding's grade_key, falls back to raw. All cards
// share the same monthly dates, so we index by (card|grade|date) directly.
export function valuePortfolioSeries(
  holdings: Holding[],
  rows: PriceHistoryRow[]
): { date: string; value: number }[] {
  if (holdings.length === 0) return [];
  const at = new Map<string, number>();
  const dates = new Set<string>();
  for (const r of rows) {
    at.set(`${r.card_id}|${r.grade_key}|${r.recorded_on}`, r.value_cents);
    dates.add(r.recorded_on);
  }
  return [...dates].sort().map((d) => {
    let value = 0;
    for (const h of holdings) {
      const gk = holdingGradeKey(h);
      const v = at.get(`${h.card_id}|${gk}|${d}`) ?? at.get(`${h.card_id}|raw|${d}`) ?? 0;
      value += v * Math.max(h.quantity, 1);
    }
    return { date: d, value };
  });
}
