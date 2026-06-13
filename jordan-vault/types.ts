// Standalone types for the Jordan Vault scrape. Intentionally NOT imported from
// the Coqui Cardboard app — this dataset is independent of the app's schema.

/** A card as returned by jordan-vault.com's /api/cards/{id} detail endpoint. */
export type ApiCard = {
  id: number;
  indexNumber: number | null;
  year: string | null;
  cardName: string | null;
  cardNumber: string | null;
  manufacturer: string | null;
  brand: string | null;
  cardType: string | null;
  hierarchy: string | null; // e.g. "Tier 1-Page 01-Row 2"
  frontLink: string | null; // image URL
  backLink: string | null; // image URL
  playerOdds: string | null;
  psaPopReport: string | null; // URL to PSA pop report
  ebaySoldListings: string | null; // label/flag, e.g. "eBay Sold"
  hasFrontImage: boolean;
  hasBackImage: boolean;
  // Per-user fields exist in the API (collection/grade/qty/inWantList…) but are
  // null for anonymous requests and are catalog-irrelevant, so we drop them.
};

/** Our normalized, self-contained record written to data/cards.{json,csv}. */
export type CardRecord = {
  id: number;
  indexNumber: number | null;
  sourceUrl: string | null; // canonical /cards/{id}-{slug} URL (from sitemap)
  slug: string | null;
  name: string | null;
  year: number | null;
  manufacturer: string | null;
  brand: string | null;
  cardNumber: string | null;
  cardType: string | null;
  // Parsed out of `hierarchy` when present:
  hierarchy: string | null;
  tier: number | null;
  page: number | null;
  row: number | null;
  // Media + references:
  frontImage: string | null;
  backImage: string | null;
  hasFrontImage: boolean;
  hasBackImage: boolean;
  playerOdds: string | null;
  psaPopReport: string | null;
  ebaySoldListings: string | null;
};
