// Pure helpers for the card detail page — summarize a grade's price history.
import type { PriceSeries } from "@/lib/queries";

export type PriceStats = {
  high: number; // cents, all-time high
  low: number; // cents, all-time low
  changePct: number | null; // latest vs first point, null if <2 points
  points: number;
};

/**
 * Summarize the price history for a single grade: all-time high/low and the
 * percentage change from the first to the latest recorded point. Returns null
 * when there isn't enough history to be meaningful (<2 points).
 */
export function priceStats(series: PriceSeries[], gradeKey: string): PriceStats | null {
  const grade = series.find((s) => s.grade_key === gradeKey) ?? series[0];
  if (!grade) return null;
  const values = grade.points.map((p) => p.value).filter((v) => v != null);
  if (values.length < 2) return null;
  const high = Math.max(...values);
  const low = Math.min(...values);
  const first = values[0];
  const last = values[values.length - 1];
  const changePct = first > 0 ? Math.round(((last - first) / first) * 100) : null;
  return { high, low, changePct, points: values.length };
}
