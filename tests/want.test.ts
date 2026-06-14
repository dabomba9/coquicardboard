import { describe, it, expect } from "vitest";
import { isDeal, wantSort } from "@/lib/want";

describe("isDeal", () => {
  it("true when current is at or below target", () => {
    expect(isDeal(100, 100)).toBe(true); // equal
    expect(isDeal(80, 100)).toBe(true); // under
  });
  it("false when over target or data missing", () => {
    expect(isDeal(120, 100)).toBe(false);
    expect(isDeal(null, 100)).toBe(false);
    expect(isDeal(80, null)).toBe(false);
    expect(isDeal(null, null)).toBe(false);
  });
});

describe("wantSort (best deal)", () => {
  const item = (current: number | null, target: number | null) => ({ current_cents: current, target_cents: target });

  it("puts under-target items first", () => {
    const a = item(50, 100); // deal
    const b = item(200, 100); // not a deal
    expect([b, a].sort(wantSort)).toEqual([a, b]);
  });

  it("orders deals by cheapest current first", () => {
    const cheap = item(20, 100);
    const dear = item(90, 100);
    expect([dear, cheap].sort(wantSort)).toEqual([cheap, dear]);
  });

  it("sinks items with no current value to the bottom", () => {
    const known = item(300, null);
    const unknown = item(null, null);
    expect([unknown, known].sort(wantSort)).toEqual([known, unknown]);
  });
});
