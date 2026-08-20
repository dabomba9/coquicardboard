import { describe, it, expect } from "vitest";
import { isRealPriceSource } from "@/lib/prices";

// This predicate is the single gate keeping fabricated pricing off the site, so
// pin its exact contract. Production once held 943 'estimated' + 10 'manual'
// card_prices rows, some absurd (a "PSA10 $5,783,321.77"); only the eBay sources
// may ever be treated as real.
describe("isRealPriceSource", () => {
  it("accepts the eBay marketplace sources", () => {
    expect(isRealPriceSource("ebay (sold)")).toBe(true);
    expect(isRealPriceSource("ebay (asking)")).toBe(true);
  });

  it("rejects fabricated and sentinel sources", () => {
    expect(isRealPriceSource("estimated")).toBe(false);
    expect(isRealPriceSource("manual")).toBe(false);
    expect(isRealPriceSource("none")).toBe(false);
  });

  it("rejects missing sources", () => {
    expect(isRealPriceSource(null)).toBe(false);
    expect(isRealPriceSource(undefined)).toBe(false);
    expect(isRealPriceSource("")).toBe(false);
  });

  it("matches on the ebay prefix, so new eBay-sourced variants pass", () => {
    expect(isRealPriceSource("ebay")).toBe(true);
    expect(isRealPriceSource("ebay-sold")).toBe(true);
  });

  it("is case-sensitive and not substring-matched, so lookalikes are rejected", () => {
    expect(isRealPriceSource("eBay (sold)")).toBe(false);
    expect(isRealPriceSource("not-ebay")).toBe(false);
    expect(isRealPriceSource("estimated-from-ebay")).toBe(false);
  });
});
