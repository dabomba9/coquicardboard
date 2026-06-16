import { describe, it, expect } from "vitest";
import { ebaySearchUrl, ebaySoldUrl, sportsCardsProUrl } from "@/lib/affiliate";

// NEXT_PUBLIC_EBAY_CAMPID is unset in tests, so these are plain search URLs.
describe("eBay link builders", () => {
  it("ebaySearchUrl is a plain eBay search with the query", () => {
    const u = ebaySearchUrl("1986 Fleer Michael Jordan");
    expect(u).toContain("https://www.ebay.com/sch/i.html?");
    expect(u).toContain("_nkw=1986+Fleer+Michael+Jordan");
    expect(u).not.toContain("LH_Sold");
  });

  it("ebaySoldUrl adds the sold/completed filters", () => {
    const u = ebaySoldUrl("1986 Fleer Michael Jordan");
    expect(u).toContain("LH_Sold=1");
    expect(u).toContain("LH_Complete=1");
    expect(u).toContain("_nkw=1986+Fleer+Michael+Jordan");
  });
});

describe("sportsCardsProUrl", () => {
  it("builds a SportsCardsPro price-guide search with the query (no eBay/affiliate params)", () => {
    const u = sportsCardsProUrl("1986 Fleer Michael Jordan");
    expect(u).toContain("https://www.sportscardspro.com/search-products?");
    expect(u).toContain("q=1986+Fleer+Michael+Jordan");
    expect(u).toContain("type=prices");
    expect(u).not.toContain("ebay");
    expect(u).not.toContain("campid");
  });
});
