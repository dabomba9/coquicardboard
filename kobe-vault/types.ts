// Normalized record the Kobe Vault scraper writes to kobe-vault/data/cards.json.
// Facts only (TCDB images are NOT stored/redistributed).
export type CardRecord = {
  id: number;            // stable sequential id (assigned in scrape order)
  slug: string | null;   // slugified name
  name: string | null;   // "<season> <set> #<num> Kobe Bryant"
  year: number | null;   // leading season year (e.g. 1996 for 1996-97)
  manufacturer: string | null;
  brand: string | null;  // set/brand label
  cardNumber: string | null;
  cardType: string | null; // Base | Insert | Parallel | Auto | Relic | … (best-effort)
  tier: number | null;   // n/a for vault
  page: number | null;
  row: number | null;
  frontImage: string | null; // always null (no TCDB images)
  backImage: string | null;  // always null
  psaPopReport: string | null;
};
