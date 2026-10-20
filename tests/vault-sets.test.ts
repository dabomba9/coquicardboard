import { describe, it, expect } from "vitest";
import { groupVaultSets, setSlug, isSetPageWorthy, type SetCard } from "@/lib/vault-sets";

const card = (id: string, name: string, num: string, year = 1998, img = true): SetCard =>
  ({ id, slug: id, name, card_number: num, year, image_url: img ? `https://x/${id}.jpg` : null });

describe("setSlug", () => {
  it("makes stable URL slugs", () => {
    expect(setSlug("1998 Upper Deck Michael Jordan Living Legend")).toBe("1998-upper-deck-michael-jordan-living-legend");
    expect(setSlug("1997-98 SkyBox Z-Force - Super Rave")).toBe("1997-98-skybox-z-force-super-rave");
    expect(setSlug("1971 Kellogg's 3-D Super Stars")).toBe("1971-kellogg-s-3-d-super-stars");
  });
});

describe("groupVaultSets", () => {
  const sets = groupVaultSets([
    card("a", "1998 UD Living Legend #10 Michael Jordan", "#10"),
    card("b", "1998 UD Living Legend #2 Michael Jordan", "#2", 1998, false),
    card("c", "1998 UD Living Legend #SP1 Michael Jordan", "#SP1"),
    card("d", "1997-98 Finest #287 Michael Jordan", "#287", 1997),
    card("e", "Untitled promo", ""),
  ]);
  it("groups by the name before the card number, skipping unnumbered names", () => {
    expect(sets.map((s) => s.name)).toEqual(["1997-98 Finest", "1998 UD Living Legend"]);
  });
  it("orders a checklist by card number, numerically", () => {
    expect(sets[1].cards.map((c) => c.card_number)).toEqual(["#SP1", "#2", "#10"]);
  });
  it("counts imaged cards and years", () => {
    expect(sets[1].imaged).toBe(2);
    expect([sets[1].yearFrom, sets[1].yearTo]).toEqual([1998, 1998]);
  });
  it("only real checklists with something to show earn a page", () => {
    expect(isSetPageWorthy(sets[1])).toBe(true);
    expect(isSetPageWorthy(sets[0])).toBe(false); // 1 card
    expect(isSetPageWorthy({ cards: sets[1].cards, imaged: 0 })).toBe(false);
    expect(isSetPageWorthy({ cards: sets[1].cards, imaged: 0 }, 2)).toBe(true);
  });
});
