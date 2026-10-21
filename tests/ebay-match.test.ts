import { describe, it, expect } from "vitest";
import {
  requiredTokenGroups, matchesCard, gradeMatches, median, priceFromListings, extractYear,
  isJunkTitle, trimOutliers, titleMatchesCard, cardNumberPattern, numberConsistent,
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

  it("excludes lot/reprint/custom listings before pricing", () => {
    const noisy = [
      ...listings.slice(0, 3),
      { title: "1997 Metal Universe PMG Green PSA 9 Jordan LOT of 3", cents: 5000_00 },
      { title: "1997 Metal Universe PMG Green PSA 9 Jordan REPRINT", cents: 50_00 },
      { title: "Custom 1997 Metal Universe PMG Green PSA 9 Jordan", cents: 30_00 },
    ];
    const r = priceFromListings(noisy, NAME, "PSA9", 3);
    expect(r!.count).toBe(3); // only the 3 genuine comps survive
    expect(r!.medianCents).toBe(62000_00);
  });

  it("trims an extreme outlier so it can't skew the median", () => {
    const withOutlier = [
      { title: "1997 Metal Universe PMG Green PSA 9 Jordan", cents: 60000_00 },
      { title: "1997-98 Metal Universe PMG Green Jordan PSA 9", cents: 61000_00 },
      { title: "1997 Metal Universe PMG Green PSA 9 Michael Jordan", cents: 62000_00 },
      { title: "1997 Metal Universe PMG Green PSA 9 Jordan", cents: 63000_00 },
      { title: "1997 Metal Universe PMG Green PSA 9 Jordan", cents: 5_000000_00 }, // absurd
    ];
    const r = priceFromListings(withOutlier, NAME, "PSA9", 3);
    expect(r!.count).toBe(4); // the $5M listing dropped
    expect(r!.medianCents).toBeLessThan(70000_00);
  });
});

describe("isJunkTitle", () => {
  it("flags lots/reprints/customs/breaks/quantities", () => {
    for (const t of ["Jordan lot of 5", "Jordan RC reprint", "custom Jordan card",
      "Jordan case break spot", "Jordan PSA 9 x3", "Jordan (4) cards"]) {
      expect(isJunkTitle(t)).toBe(true);
    }
  });
  it("passes a normal single-card title", () => {
    expect(isJunkTitle("1986 Fleer #57 Michael Jordan RC PSA 9")).toBe(false);
  });
});

describe("trimOutliers", () => {
  it("keeps small sets and drops far outliers via IQR", () => {
    expect(trimOutliers([100, 110, 120, 130, 9999]).includes(9999)).toBe(false);
    expect(trimOutliers([100, 200]).length).toBe(2); // <3 untouched
  });
});

describe("TCDB checklist names (vintage vaults)", () => {
  it("drops the VAR tag and its descriptor so real listings match", () => {
    const name = "1956 Topps #33 Roberto Clemente VAR VAR: Gray Back";
    const groups = requiredTokenGroups(name);
    expect(groups.flat()).not.toContain("var");
    expect(groups.flat()).not.toContain("gray");
    expect(matchesCard("1956 TOPPS GRAY BACK #33 ROBERTO CLEMENTE PSA 4", extractYear(name), groups)).toBe(true);
  });
  it("drops a bare trailing VAR / CPC / UER tag", () => {
    const flat = requiredTokenGroups("1971 Milk Duds - Boxes #NNO Harmon Killebrew VAR CPC UER").flat();
    expect(flat).not.toContain("var");
    expect(flat).not.toContain("cpc");
    expect(flat).not.toContain("uer");
  });
  it("accepts Roberto for a card printed as Bob Clemente", () => {
    const name = "1963 Topps #540 Bob Clemente";
    expect(matchesCard("1963 Topps #540 Roberto Clemente Pirates SGC 3", extractYear(name), requiredTokenGroups(name))).toBe(true);
  });
});

describe("titleMatchesCard (image candidates)", () => {
  it("rejects the common base card offered for an oddball issue", () => {
    expect(titleMatchesCard("1960 Topps Roberto Clemente #326 Called Bob On Card", "1960 Topps Venezuelan Tattoos #NNO Bob Clemente")).toBe(false);
    expect(titleMatchesCard("1956 Topps Pittsburgh Pirates Team Card #121", "1956 Pittsburgh Pirates Team Issue #NNO Roberto Clemente")).toBe(false);
  });
  it("accepts a listing of the actual card", () => {
    expect(titleMatchesCard("1963 Jell-O #143 Roberto Clemente Pirates", "1963 Jell-O #143 Roberto Clemente")).toBe(true);
  });
});

describe("TCDB serial / memorabilia tags (Kobe Vault)", () => {
  it("drops SN### and MEM so listings can match", () => {
    const name = "1996 Collector's Edge Rookie Rage - Key Kraze #3 Kobe Bryant SN3200";
    const flat = requiredTokenGroups(name).flat();
    expect(flat).not.toContain("sn3200");
    expect(matchesCard("1996 Collector's Edge Rookie Rage Key Kraze #3 Kobe Bryant /3200", extractYear(name), requiredTokenGroups(name))).toBe(true);
    const mem = "2006-07 Bowman Elevation - Executive Level Relics (79) Blue #ELR-KB Kobe Bryant MEM, SN79";
    const memFlat = requiredTokenGroups(mem).flat();
    expect(memFlat).not.toContain("mem");
    expect(memFlat).not.toContain("sn79");
    expect(memFlat).toContain("relics");
  });
  it("does not strip words that merely start with sn", () => {
    expect(requiredTokenGroups("1997 Fleer Sneaker Sensations #1 Kobe Bryant").flat()).toContain("sneaker");
  });
});

describe("card number must be in the listing", () => {
  const legacy = "2008-09 Upper Deck Michael Jordan Legacy Collection #1032 Michael Jordan - Game 1032";
  it("builds a tolerant pattern, and none for unnumbered cards", () => {
    expect(cardNumberPattern("1996-97 Topps - ProFiles #PF-3 Michael Jordan")!.test("1996 Topps Pro Files PF3 Michael Jordan")).toBe(true);
    expect(cardNumberPattern("1996-97 Topps - ProFiles #PF-3 Michael Jordan")!.test("1996 Topps Pro Files #PF-3 Jordan")).toBe(true);
    expect(cardNumberPattern("1991-92 Hoops #30 Michael Jordan")!.test("1991 Hoops #303 Jordan")).toBe(false);
    const p = cardNumberPattern("1991-92 Hoops #30 Michael Jordan");
    expect(numberConsistent("1991 Hoops #303 Jordan", p)).toBe(false);   // names another card
    expect(numberConsistent("1991 Hoops #30 Jordan", p)).toBe(true);
    expect(numberConsistent("1991 Hoops Michael Jordan Bulls", p)).toBe(true); // no number → can't contradict
    expect(cardNumberPattern("1956 Pittsburgh Pirates Team Issue #NNO Roberto Clemente")).toBeNull();
  });
  it("won't price a card off other cards in its set", () => {
    const others = [1, 2, 3, 4, 5].map((i) => ({ title: `2008-09 Upper Deck Michael Jordan Legacy Collection #${100 + i} Michael Jordan`, cents: 999 }));
    expect(priceFromListings(others, "2008-09 Upper Deck Michael Jordan Legacy Collection #1032 Michael Jordan", "raw", 3)).toBeNull();
    const own = [1, 2, 3].map(() => ({ title: "2008-09 Upper Deck Legacy Collection #1032 Michael Jordan", cents: 499 }));
    expect(priceFromListings([...others, ...own], "2008-09 Upper Deck Michael Jordan Legacy Collection #1032 Michael Jordan", "raw", 3)).toEqual({ medianCents: 499, count: 3 });
    expect(legacy).toContain("#1032");
  });
});
