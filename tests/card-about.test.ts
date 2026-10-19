import { describe, it, expect } from "vitest";
import { aboutCard, formatCardNumber, printRunFromName, vaultSetName, type AboutInput } from "@/lib/card-about";

const base: AboutInput = {
  name: "1998 Upper Deck Michael Jordan Living Legend #89 Michael Jordan",
  year: 1998, cardNumber: "#89", setName: "1998 Upper Deck Michael Jordan Living Legend",
  manufacturer: "Upper Deck", cardType: "Base", printRun: null, player: "Michael Jordan",
  catalogLabel: "Jordan Vault", setCount: 120, tierName: null, hasBack: true,
  price: { cents: 399, sample: 35, asOf: "2026-10-19T08:00:00Z" }, lastCheckedNoListings: null,
};

describe("formatCardNumber", () => {
  it("never doubles the #", () => {
    expect(formatCardNumber("#89")).toBe("#89");
    expect(formatCardNumber("89")).toBe("#89");
    expect(formatCardNumber("##89")).toBe("#89");
    expect(formatCardNumber("")).toBeNull();
  });
});

describe("printRunFromName", () => {
  it("reads /N and TCDB SN tags", () => {
    expect(printRunFromName("1997 Metal Universe PMG Green #23 /10")).toBe(10);
    expect(printRunFromName("2006-07 Bowman Elevation Relics Blue #ELR-KB Kobe Bryant MEM, SN79")).toBe(79);
    expect(printRunFromName("1998 Upper Deck #23 Michael Jordan")).toBeNull();
  });
});

describe("vaultSetName", () => {
  it("is the name before the card number", () => {
    expect(vaultSetName(base.name)).toBe("1998 Upper Deck Michael Jordan Living Legend");
    expect(vaultSetName("Untitled promo")).toBeNull();
  });
});

describe("aboutCard", () => {
  it("states only real facts, in plain sentences", () => {
    const t = aboutCard(base).join(" ");
    expect(t).toContain("card #89 in 1998 Upper Deck Michael Jordan Living Legend");
    expect(t).not.toContain("##");
    expect(t).toContain("It's a base-set card.");
    expect(t).toContain("tracks 120 Michael Jordan cards from this set");
    expect(t).toContain("around $3.99 on eBay across 35 listings as of October 19, 2026");
    expect(t).toContain("front and the back");
  });
  it("differs between two cards of the same set", () => {
    const other = aboutCard({ ...base, cardNumber: "#90", price: null, lastCheckedNoListings: "2026-10-19T08:00:00Z", hasBack: false });
    expect(other.join(" ")).not.toBe(aboutCard(base).join(" "));
    expect(other.join(" ")).toContain("no listings matched this card");
  });
  it("omits what it doesn't know", () => {
    const t = aboutCard({ ...base, cardType: null, setCount: 0, price: null, hasBack: false }).join(" ");
    expect(t).not.toMatch(/tracks|listed|It's a/);
  });
  it("doesn't repeat the maker when the set name already says it (any case)", () => {
    const t = aboutCard({ ...base, setName: "1998 Skybox", manufacturer: "SkyBox", cardNumber: "41" }).join(" ");
    expect(t).toContain("This is card #41 in 1998 Skybox.");
  });
  it("adds print run and tier when present", () => {
    const t = aboutCard({ ...base, cardType: "Insert", printRun: 50, tierName: "Pinnacle", catalogLabel: "MJ Hierarchy" }).join(" ");
    expect(t).toContain("It's an insert, serial numbered to 50.");
    expect(t).toContain("Pinnacle tier of the MJ Hierarchy");
  });
});
