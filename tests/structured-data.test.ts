import { describe, it, expect } from "vitest";
import { productJsonLd, breadcrumbJsonLd, websiteJsonLd, articleJsonLd, collectionJsonLd } from "@/lib/structured-data";

describe("productJsonLd", () => {
  it("emits a Product with AggregateOffer when priced", () => {
    const d = productJsonLd({
      name: "1986 Fleer #57 Michael Jordan",
      slug: "1986-fleer-57",
      description: "desc",
      image: "https://img/x.jpg",
      brand: "Fleer",
      pricesUsd: [120.5, 9000, 450],
      offerUrl: "https://ebay/x",
    });
    expect(d["@type"]).toBe("Product");
    expect((d.brand as Record<string, unknown>).name).toBe("Fleer");
    const offers = d.offers as Record<string, unknown>;
    expect(offers["@type"]).toBe("AggregateOffer");
    expect(offers.lowPrice).toBe("120.50");
    expect(offers.highPrice).toBe("9000.00");
    expect(offers.offerCount).toBe(3);
    expect(offers.priceCurrency).toBe("USD");
  });

  it("omits offers when there are no positive prices", () => {
    const d = productJsonLd({ name: "x", slug: "x", description: "d", pricesUsd: [] });
    expect(d.offers).toBeUndefined();
    const d2 = productJsonLd({ name: "x", slug: "x", description: "d", pricesUsd: [0, NaN] });
    expect(d2.offers).toBeUndefined();
  });

  it("is JSON-serializable", () => {
    const d = productJsonLd({ name: "x", slug: "x", description: "d", pricesUsd: [10] });
    expect(() => JSON.stringify(d)).not.toThrow();
  });
});

describe("breadcrumbJsonLd", () => {
  it("uses the Jordan Vault path for vault cards", () => {
    const d = breadcrumbJsonLd({ name: "Card", slug: "v1-card", catalog: "mj-vault" });
    const items = d.itemListElement as { name: string; item: string }[];
    expect(items).toHaveLength(3);
    expect(items[1].name).toBe("Jordan Vault");
    expect(items[1].item).toContain("/vault");
    expect(items[2].name).toBe("Card");
  });
  it("uses the Mamba Origins path for kobe-hierarchy cards", () => {
    const d = breadcrumbJsonLd({ name: "Card", slug: "kobe-c", catalog: "kobe-hierarchy" });
    const items = d.itemListElement as { name: string; item: string }[];
    expect(items[1].name).toBe("Mamba Origins");
    expect(items[1].item).toContain("/kobe-hierarchy");
  });
  it("uses the Mamba Hierarchy path for mamba-hierarchy cards", () => {
    const d = breadcrumbJsonLd({ name: "Card", slug: "mamba-c", catalog: "mamba-hierarchy" });
    const items = d.itemListElement as { name: string; item: string }[];
    expect(items[1].name).toBe("Mamba Hierarchy");
    expect(items[1].item).toContain("/mamba-hierarchy");
  });
  it("uses the MJ Hierarchy path otherwise", () => {
    const d = breadcrumbJsonLd({ name: "Card", slug: "c", catalog: "mj-hierarchy" });
    const items = d.itemListElement as { name: string; item: string }[];
    expect(items[1].name).toBe("MJ Hierarchy");
    expect(items[1].item).toContain("/mj-hierarchy");
  });
});

describe("websiteJsonLd / articleJsonLd", () => {
  it("website has a SearchAction", () => {
    const d = websiteJsonLd();
    expect(d["@type"]).toBe("WebSite");
    expect((d.potentialAction as Record<string, unknown>)["@type"]).toBe("SearchAction");
  });
  it("article carries headline + date", () => {
    const d = articleJsonLd({ title: "T", description: "D", slug: "s", date: "2026-06-01" });
    expect(d["@type"]).toBe("Article");
    expect(d.headline).toBe("T");
    expect(d.datePublished).toBe("2026-06-01");
  });
});

describe("collectionJsonLd", () => {
  const items = [{ name: "Card A", slug: "a" }, { name: "Card B", slug: "b" }];

  it("wraps an ItemList in a CollectionPage", () => {
    const d = collectionJsonLd({ name: "Jordan Vault", description: "D", path: "/vault", items });
    expect(d["@type"]).toBe("CollectionPage");
    expect(d.url).toContain("/vault");
    const list = d.mainEntity as Record<string, unknown>;
    expect(list["@type"]).toBe("ItemList");
    expect(list.numberOfItems).toBe(2);
  });

  it("numbers positions from 1 and links each card", () => {
    const d = collectionJsonLd({ name: "V", description: "D", path: "/vault", items });
    const els = (d.mainEntity as { itemListElement: { position: number; name: string; url: string }[] }).itemListElement;
    expect(els.map((e) => e.position)).toEqual([1, 2]);
    expect(els[0].name).toBe("Card A");
    expect(els[1].url).toContain("/cards/b");
  });

  it("handles an empty page without inventing entries", () => {
    const d = collectionJsonLd({ name: "V", description: "D", path: "/vault", items: [] });
    const list = d.mainEntity as { numberOfItems: number; itemListElement: unknown[] };
    expect(list.numberOfItems).toBe(0);
    expect(list.itemListElement).toEqual([]);
  });
});
