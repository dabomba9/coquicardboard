import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { GUIDES } from "@/data/guides";
import { catalogMeta } from "@/lib/catalogs";
import { loadMambaHierarchy } from "@/data/mamba-hierarchy";

// Vault seed files and the slug prefix seed-vault.ts gives each (package.json seed:vault:*).
// A DB slug is `${prefix}${tcdbId}-${slug}`.
const VAULT_SEEDS: Record<string, { file: string; prefix: string }> = {
  "clemente-vault": { file: "data/clemente-vault.json", prefix: "rc" },
  "killebrew-vault": { file: "data/killebrew-vault.json", prefix: "hk" },
  "kobe-vault": { file: "data/kobe-vault.json", prefix: "kv" },
};

function vaultSlugs(catalog: string): Set<string> {
  const seed = VAULT_SEEDS[catalog];
  if (!seed) throw new Error(`no seed file mapped for ${catalog}`);
  const cards: { id: number; slug: string }[] = JSON.parse(readFileSync(seed.file, "utf8"));
  return new Set(cards.map((c) => `${seed.prefix}${c.id}-${c.slug}`));
}

describe("guides", () => {
  it("have unique slugs and a known catalog for every card block", () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
    for (const g of GUIDES) if (g.cardList) expect(catalogMeta(g.cardList.catalog), g.slug).toBeDefined();
  });

  // A mistyped slug would silently drop a card from the live block.
  it("hand-picked slugs all exist in their catalog's seed data", () => {
    for (const g of GUIDES) {
      if (!g.cardList?.slugs) continue;
      const known = vaultSlugs(g.cardList.catalog);
      const missing = g.cardList.slugs.filter((s) => !known.has(s));
      expect(missing, g.slug).toEqual([]);
      expect(new Set(g.cardList.slugs).size, `${g.slug} has duplicate slugs`).toBe(g.cardList.slugs.length);
    }
  });

  it("the Black Mamba guide's count matches its tier", () => {
    const g = GUIDES.find((x) => x.slug === "black-mamba-tier-kobe-grails")!;
    const tier1 = loadMambaHierarchy().filter((c) => c.tier_id === 1);
    expect(g.cardList?.heading).toContain(String(tier1.length));
  });
});
