import { describe, it, expect } from "vitest";
import {
  parseVaultParams,
  vaultFilterOptions,
  vaultFacets,
  filterSortVault,
  PAGE_SIZE,
} from "@/lib/vault-filter";
import type { VaultRow } from "@/lib/queries";

const row = (id: string, over: Partial<VaultRow> & { manufacturer?: string; cardType?: string } = {}): VaultRow => ({
  id,
  slug: `v${id}`,
  name: over.name ?? `Card ${id}`,
  card_number: over.card_number ?? null,
  year: over.year ?? 1990,
  image_url: over.image_url ?? null,
  attributes: { manufacturer: over.manufacturer ?? null, cardType: over.cardType ?? null },
});

const sample: VaultRow[] = [
  row("a", { name: "Fleer Rookie", year: 1986, manufacturer: "Fleer", cardType: "Base", image_url: "x" }),
  row("b", { name: "Upper Deck Auto", year: 1998, manufacturer: "Upper Deck", cardType: "Auto" }),
  row("c", { name: "Upper Deck Base", year: 1995, manufacturer: "Upper Deck", cardType: "Base", image_url: "y" }),
  row("d", { name: "Topps Insert", year: 1992, manufacturer: "Topps", cardType: "Insert", card_number: "23" }),
];

describe("parseVaultParams", () => {
  it("defaults are sane", () => {
    expect(parseVaultParams({})).toEqual({
      q: "", manufacturer: "", cardType: "", year: "", hasImage: false,
      ownership: "all", sort: "year", page: 1,
    });
  });
  it("reads + validates url params", () => {
    const p = parseVaultParams({ q: "jordan", type: "Auto", year: "1998", img: "1", ownership: "owned", sort: "name", page: "3" });
    expect(p).toMatchObject({ q: "jordan", cardType: "Auto", year: "1998", hasImage: true, ownership: "owned", sort: "name", page: 3 });
  });
  it("rejects bad sort/ownership/page", () => {
    const p = parseVaultParams({ sort: "bogus", ownership: "nope", page: "-2" });
    expect(p.sort).toBe("year");
    expect(p.ownership).toBe("all");
    expect(p.page).toBe(1);
  });
});

describe("vaultFilterOptions", () => {
  it("returns sorted distinct manufacturers/types/years", () => {
    const o = vaultFilterOptions(sample);
    expect(o.manufacturers).toEqual(["Fleer", "Topps", "Upper Deck"]);
    expect(o.cardTypes).toEqual(["Auto", "Base", "Insert"]);
    expect(o.years).toEqual([1986, 1992, 1995, 1998]);
  });
});

describe("vaultFacets", () => {
  it("computes overall + per-manufacturer owned/total/pct", () => {
    const owned = new Set(["a", "c"]); // 2 owned: Fleer(1/1), Upper Deck(1/2)
    const f = vaultFacets(sample, owned);
    expect(f[0]).toMatchObject({ label: "Collected", manufacturer: "", owned: 2, total: 4, pct: 50 });
    const ud = f.find((x) => x.manufacturer === "Upper Deck")!;
    expect(ud).toMatchObject({ owned: 1, total: 2, pct: 50 });
    const fleer = f.find((x) => x.manufacturer === "Fleer")!;
    expect(fleer).toMatchObject({ owned: 1, total: 1, pct: 100 });
  });
});

describe("filterSortVault", () => {
  const none = new Set<string>();
  it("search matches name or card number", () => {
    expect(filterSortVault(sample, parseVaultParams({ q: "upper" }), none).total).toBe(2);
    expect(filterSortVault(sample, parseVaultParams({ q: "23" }), none).items[0].id).toBe("d");
  });
  it("filters by manufacturer, type, year, hasImage", () => {
    expect(filterSortVault(sample, { ...parseVaultParams({}), manufacturer: "Upper Deck" }, none).total).toBe(2);
    expect(filterSortVault(sample, parseVaultParams({ type: "Base" }), none).total).toBe(2);
    expect(filterSortVault(sample, parseVaultParams({ year: "1986" }), none).total).toBe(1);
    expect(filterSortVault(sample, parseVaultParams({ img: "1" }), none).total).toBe(2);
  });
  it("ownership owned/needed split by ownedIds", () => {
    const owned = new Set(["a", "c"]);
    expect(filterSortVault(sample, parseVaultParams({ ownership: "owned" }), owned).total).toBe(2);
    expect(filterSortVault(sample, parseVaultParams({ ownership: "needed" }), owned).total).toBe(2);
  });
  it("sorts by year asc/desc and name", () => {
    expect(filterSortVault(sample, parseVaultParams({ sort: "year" }), none).items.map((i) => i.year)).toEqual([1986, 1992, 1995, 1998]);
    expect(filterSortVault(sample, parseVaultParams({ sort: "year_desc" }), none).items.map((i) => i.year)).toEqual([1998, 1995, 1992, 1986]);
    expect(filterSortVault(sample, parseVaultParams({ sort: "name" }), none).items[0].name).toBe("Fleer Rookie");
  });
  it("paginates with PAGE_SIZE and clamps the page", () => {
    const many = Array.from({ length: PAGE_SIZE + 10 }, (_, i) => row(`m${i}`, { year: 2000 + i }));
    const p1 = filterSortVault(many, parseVaultParams({}), none);
    expect(p1.items.length).toBe(PAGE_SIZE);
    expect(p1.pages).toBe(2);
    const p99 = filterSortVault(many, parseVaultParams({ page: "99" }), none);
    expect(p99.page).toBe(2);
    expect(p99.items.length).toBe(10);
  });
});
