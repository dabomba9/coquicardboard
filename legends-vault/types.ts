// Normalized record the vault scraper writes to legends-vault/data/<player>/cards.json.
// Facts only (TCDB images are NOT stored/redistributed). Same shape as kobe-vault.
export type CardRecord = {
  id: number;            // TCDB card id (cid; stable)
  slug: string | null;   // slugified name
  name: string | null;   // "<season> <set> #<num> <Player>"
  year: number | null;   // leading season year
  manufacturer: string | null;
  brand: string | null;  // set/brand label
  cardNumber: string | null;
  cardType: string | null; // Base | Insert | Auto | Relic | … (best-effort)
  tier: number | null;   // n/a for vault
  page: number | null;
  row: number | null;
  frontImage: string | null; // always null (no TCDB images)
  backImage: string | null;  // always null
  psaPopReport: string | null;
};
