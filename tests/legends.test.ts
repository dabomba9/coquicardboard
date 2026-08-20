import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { legendArtForCatalog, LEGEND_ART } from "@/lib/legends";

describe("legendArtForCatalog", () => {
  it("maps every live catalog to its player's art", () => {
    expect(legendArtForCatalog("mj-hierarchy")).toBe(LEGEND_ART.jordan);
    expect(legendArtForCatalog("mj-vault")).toBe(LEGEND_ART.jordan);
    expect(legendArtForCatalog("kobe-hierarchy")).toBe(LEGEND_ART.bryant);
    expect(legendArtForCatalog("kobe-vault")).toBe(LEGEND_ART.bryant);
    expect(legendArtForCatalog("clemente-vault")).toBe(LEGEND_ART.clemente);
    expect(legendArtForCatalog("killebrew-vault")).toBe(LEGEND_ART.killebrew);
  });

  // mamba-hierarchy is the one Kobe catalog whose key doesn't start with "kobe".
  it("treats mamba-hierarchy as Kobe", () => {
    expect(legendArtForCatalog("mamba-hierarchy")).toBe(LEGEND_ART.bryant);
  });

  it("falls back to Jordan for unknown or missing catalogs", () => {
    expect(legendArtForCatalog(null)).toBe(LEGEND_ART.jordan);
    expect(legendArtForCatalog(undefined)).toBe(LEGEND_ART.jordan);
    expect(legendArtForCatalog("")).toBe(LEGEND_ART.jordan);
    expect(legendArtForCatalog("some-future-vault")).toBe(LEGEND_ART.jordan);
  });

  // A typo'd filename type-checks fine but renders a broken image, so assert the
  // assets actually exist on disk.
  it("points at files that exist in public/", () => {
    for (const path of Object.values(LEGEND_ART)) {
      expect(existsSync(join(process.cwd(), "public", path)), `missing ${path}`).toBe(true);
    }
  });
});
