import { describe, it, expect } from "vitest";
import { loadMambaHierarchy, MAMBA_TIERS } from "@/data/mamba-hierarchy";

describe("Mamba Hierarchy (curated)", () => {
  const cards = loadMambaHierarchy();

  it("has exactly 3 tiers", () => {
    expect(MAMBA_TIERS.map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it("assigns every card to a tier in 1..3", () => {
    expect(cards.length).toBeGreaterThan(50);
    expect(cards.every((c) => c.tier_id >= 1 && c.tier_id <= 3)).toBe(true);
  });

  it("is front-loaded: Tier 1 (grails) is the smallest tier", () => {
    const n = (t: number) => cards.filter((c) => c.tier_id === t).length;
    expect(n(1)).toBeGreaterThan(0);
    expect(n(1)).toBeLessThanOrEqual(n(2));
    expect(n(2)).toBeLessThanOrEqual(n(3));
  });

  it("includes the cornerstone Kobe rookie (Topps Chrome Refractor) in Tier 1", () => {
    const grail = cards.find((c) => /Topps Chrome Refractor #138/.test(c.name));
    expect(grail?.tier_id).toBe(1);
    expect(grail?.is_rookie).toBe(true);
  });

  it("spans his career (rookies through retirement-era)", () => {
    const years = cards.map((c) => c.year);
    expect(Math.min(...years)).toBe(1996);
    expect(Math.max(...years)).toBeGreaterThanOrEqual(2016);
  });
});
