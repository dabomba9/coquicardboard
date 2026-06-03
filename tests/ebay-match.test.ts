import { describe, it, expect } from "vitest";
import {
  requiredTokenGroups, matchesCard, gradeMatches, median, priceFromListings, extractYear,
} from "@/lib/ebay-match";

const NAME = "1997 Metal Universe PMG Green #23 /10";

describe("requiredTokenGroups", () => {
  it("keeps distinctive tokens, drops year/number/player, expands PMG", () => {
    const g = requiredTokenGroups(NAME);
    const flat = g.map((x) => x.join("|"));
    expect(flat).toContain("metal");
    expect(flat).toContain("universe");
    expect(flat).toContain("green");
    expect(flat).toContain("pmg|precious metal gems");
    expect(flat.join(" ")).not.toMatch(/1997|jordan|"23"/);
  });
});

describe("matchesCard", () => {
  const year = extractYear(NAME);
  const groups = requiredTokenGroups(NAME);
  it("matches a real PMG Green listing (with full 'Precious Metal Gems')", () => {
    expect(matchesCard("1997-98 Metal Universe Michael Jordan Precious Metal Gems Green #23 PSA 9", year, groups)).toBe(true);
  });
  it("rejects a generic Metal Universe base listing (no PMG/green)", () => {
    expect(matchesCard("1997 Metal Universe Michael Jordan #23 PSA 10", year, groups)).toBe(false);
  });
  it("rejects the wrong color (Red)", () => {
    expect(matchesCard("1997 Metal Universe Precious Metal Gems Red #23 PSA 9", year, groups)).toBe(false);
  });
  it("requires the year", () => {
    expect(matchesCard("Metal Universe Precious Metal Gems Green Jordan", year, groups)).toBe(false);
  });
});

describe("gradeMatches", () => {
  it("raw excludes graded listings", () => {
    expect(gradeMatches("1997 Metal Universe Jordan raw", "raw")).toBe(true);
    expect(gradeMatches("1997 Metal Universe Jordan PSA 10", "raw")).toBe(false);
  });
  it("PSA10 requires psa 10", () => {
    expect(gradeMatches("… Jordan PSA 10 Gem Mint", "PSA10")).toBe(true);
    expect(gradeMatches("… Jordan PSA 9", "PSA10")).toBe(false);
  });
  it("BGS9.5 matches bgs/beckett 9.5", () => {
    expect(gradeMatches("… Jordan BGS 9.5", "BGS9.5")).toBe(true);
    expect(gradeMatches("… Jordan Beckett 9.5", "BGS9.5")).toBe(true);
    expect(gradeMatches("… Jordan BGS 9", "BGS9.5")).toBe(false);
  });
});

describe("median", () => {
  it("odd and even", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([10, 20, 30, 40])).toBe(25);
  });
});

describe("priceFromListings", () => {
  const listings = [
    { title: "1997 Metal Universe Precious Metal Gems Green #23 PSA 9 Jordan", cents: 60000_00 },
    { title: "1997-98 Metal Universe PMG Green Jordan PSA 9", cents: 64000_00 },
    { title: "1997 Metal Universe PMG Green PSA 9 Michael Jordan", cents: 62000_00 },
    { title: "1997 Metal Universe Jordan #23 PSA 9 (base, not PMG)", cents: 900_00 }, // excluded (no pmg/green)
  ];
  it("returns median of matching listings only when ≥ minSamples", () => {
    const r = priceFromListings(listings, NAME, "PSA9", 3);
    expect(r).not.toBeNull();
    expect(r!.count).toBe(3);
    expect(r!.medianCents).toBe(62000_00); // base $900 excluded
  });
  it("returns null when too few confident matches", () => {
    expect(priceFromListings(listings.slice(0, 1), NAME, "PSA9", 3)).toBeNull();
  });
});
