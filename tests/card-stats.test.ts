import { describe, it, expect } from "vitest";
import { priceStats } from "@/lib/card-stats";
import type { PriceSeries } from "@/lib/queries";

const series = (grade: string, values: number[]): PriceSeries => ({
  grade_key: grade,
  points: values.map((v, i) => ({ date: `2026-0${i + 1}`, value: v })),
});

describe("priceStats", () => {
  it("computes high/low and change (latest vs first)", () => {
    const s = priceStats([series("raw", [100, 250, 200])], "raw")!;
    expect(s.high).toBe(250);
    expect(s.low).toBe(100);
    expect(s.changePct).toBe(100); // 100 -> 200
    expect(s.points).toBe(3);
  });

  it("handles a decline", () => {
    const s = priceStats([series("raw", [400, 300])], "raw")!;
    expect(s.changePct).toBe(-25);
  });

  it("returns null for fewer than two points", () => {
    expect(priceStats([series("raw", [100])], "raw")).toBeNull();
    expect(priceStats([series("raw", [])], "raw")).toBeNull();
  });

  it("returns null when the series is empty", () => {
    expect(priceStats([], "raw")).toBeNull();
  });

  it("picks the requested grade, falling back to the first", () => {
    const data = [series("raw", [10, 20]), series("PSA10", [1000, 1500])];
    expect(priceStats(data, "PSA10")!.high).toBe(1500);
    expect(priceStats(data, "missing")!.high).toBe(20); // falls back to first
  });
});
