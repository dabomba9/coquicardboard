import { describe, it, expect } from "vitest";
import { isDeal, wantSort, groupByCatalog, tierThenRank } from "@/lib/want";
import { catalogOrder, catalogLabel } from "@/lib/catalogs";

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

describe("groupByCatalog", () => {
  const card = (catalog: string, tier_id: number | null, rarity_rank: number) => ({ catalog, tier_id, rarity_rank });
  it("groups mixed catalogs in registry order, tier-less vault cards included", () => {
    const groups = groupByCatalog(
      [card("clemente-vault", null, 2), card("mj-hierarchy", 2, 1), card("clemente-vault", null, 1), card("mj-hierarchy", 1, 5)],
      catalogOrder
    );
    expect(groups.map((g) => g.catalog)).toEqual(["mj-hierarchy", "clemente-vault"]);
    expect(groups[0].items.map((c) => c.tier_id)).toEqual([1, 2]);
    expect(groups[1].items.map((c) => c.rarity_rank)).toEqual([1, 2]);
  });
  it("puts unknown catalogs last", () => {
    const groups = groupByCatalog([card("some-new-vault", null, 1), card("kobe-vault", null, 1)], catalogOrder);
    expect(groups.map((g) => g.catalog)).toEqual(["kobe-vault", "some-new-vault"]);
  });
});

describe("tierThenRank", () => {
  it("sorts tier-less cards after tiered ones", () => {
    expect(tierThenRank({ catalog: "x", tier_id: null, rarity_rank: 1 }, { catalog: "x", tier_id: 4, rarity_rank: 9 })).toBeGreaterThan(0);
  });
});

describe("catalogLabel", () => {
  it("names known catalogs and falls back to the slug", () => {
    expect(catalogLabel("kobe-hierarchy")).toBe("Mamba Origins");
    expect(catalogLabel("mystery")).toBe("mystery");
  });
});
