import { describe, it, expect } from "vitest";
import { loadChecklist } from "@/data/checklist";

describe("loadChecklist (real CSV)", () => {
  const cards = loadChecklist();

  it("parses all 378 cards", () => {
    expect(cards.length).toBe(378);
  });

  it("has the real tier distribution 27/54/81/216", () => {
    const byTier = (t: number) => cards.filter((c) => c.tier_id === t).length;
    expect([byTier(1), byTier(2), byTier(3), byTier(4)]).toEqual([27, 54, 81, 216]);
  });

  it("derives year, card number, serial, and set", () => {
    const pmg = cards.find((c) => c.name.startsWith("1997 Metal Universe PMG Green"))!;
    expect(pmg.year).toBe(1997);
    expect(pmg.card_number).toBe("23");
    expect(pmg.print_run).toBe(10);
    expect(pmg.serial_numbered).toBe(true);
    expect(pmg.setName).toBe("1997 Metal Universe");
    expect(pmg.is_parallel).toBe(true);
  });

  it("flags the rookie and leaves no placeholders", () => {
    expect(cards.some((c) => c.name.includes("1986 Fleer") && c.is_rookie)).toBe(true);
    expect(cards.every((c) => c.is_placeholder === false)).toBe(true);
  });
});
