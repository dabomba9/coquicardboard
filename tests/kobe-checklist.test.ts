import { describe, it, expect } from "vitest";
import { loadKobeChecklist } from "@/data/kobe-checklist";

describe("loadKobeChecklist (real Mamba Origins CSV)", () => {
  const cards = loadKobeChecklist();

  it("parses all 143 cards", () => {
    expect(cards.length).toBe(143);
  });

  it("covers 25 distinct brands", () => {
    const brands = new Set(cards.map((c) => c.attributes!.brand));
    expect(brands.size).toBe(25);
  });

  it("flags 7 autos and 57 unlicensed cards", () => {
    expect(cards.filter((c) => c.attributes!.auto === true).length).toBe(7);
    expect(cards.filter((c) => c.attributes!.licensed === false).length).toBe(57);
  });

  it("derives card numbers, serials, and brand-based sets", () => {
    const keyKraze = cards.find((c) => c.name === "Collector's Edge Rookie Rage - Key Kraze #3")!;
    expect(keyKraze.card_number).toBe("3");
    expect(keyKraze.print_run).toBe(3200);
    expect(keyKraze.serial_numbered).toBe(true);
    expect(keyKraze.setName).toBe("1996 Collector's Edge");
    expect(keyKraze.is_insert).toBe(true);

    const chrome = cards.find((c) => c.name === "Topps Chrome - Refractors #138R")!;
    expect(chrome.card_number).toBe("138R");
    expect(chrome.is_parallel).toBe(true);
    expect(chrome.setName).toBe("1996 Topps Chrome");
  });

  it("treats every card as a 1996-97 rookie with no placeholders", () => {
    expect(cards.every((c) => c.year === 1996)).toBe(true);
    expect(cards.every((c) => c.is_rookie === true)).toBe(true);
    expect(cards.every((c) => c.is_placeholder === false)).toBe(true);
  });

  it("assigns a cosmetic rarity tier in 1..4 to every card", () => {
    expect(cards.every((c) => c.tier_id >= 1 && c.tier_id <= 4)).toBe(true);
  });
});
