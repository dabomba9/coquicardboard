// Which legend sprite stands in for a card that has no verified image.
//
// A wrong card image is worse than none, so catalogs with gaps show the player's
// hero art behind the placeholder instead (see CardThumb's `placeholderArt`).
// The catalog→player rules mirror `playerForCatalog` in lib/image-search.ts —
// keep the two in step. Paths are the same assets components/legends-hero.tsx uses.

export const LEGEND_ART = {
  jordan: "/legends/jordan.png",
  bryant: "/legends/bryant.png",
  clemente: "/legends/clemente.png",
  killebrew: "/legends/killebrew.png",
} as const;

export function legendArtForCatalog(catalog: string | null | undefined): string {
  if (catalog?.startsWith("kobe") || catalog === "mamba-hierarchy") return LEGEND_ART.bryant;
  if (catalog?.startsWith("clemente")) return LEGEND_ART.clemente;
  if (catalog?.startsWith("killebrew")) return LEGEND_ART.killebrew;
  return LEGEND_ART.jordan;
}
