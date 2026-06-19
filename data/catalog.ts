// Canonical MJ Hierarchy catalog seed data.
//
// IMPORTANT (data provenance): the tier *structure* (4 tiers) and the well-known
// cards below are real and sourced from public hobby references (TCDB, PSA, Beckett,
// and Cajun Cardboard's published hierarchy — credited). Print runs / pack odds are
// included only where reasonably known; otherwise left null rather than guessed.
//
// The full 378-card list is a manual transcription task (see plan, "Data & rights").
// Until that is complete, `generateFiller()` pads each tier to its target count with
// clearly-labeled placeholder entries (is_placeholder=true) so the app is fully
// functional end-to-end. Replace fillers with real rows as they are transcribed.

export type Tier = {
  id: number;
  name: string;
  slug: string;
  rank: number;
  description: string;
  targetCount: number; // total cards this tier should hold in the full hierarchy
};

export type SeedCard = {
  name: string;
  tier_id: number;
  setName: string;
  year: number;
  manufacturer: string;
  card_number?: string;
  is_rookie?: boolean;
  is_insert?: boolean;
  is_parallel?: boolean;
  print_run?: number | null;
  serial_numbered?: boolean;
  pack_odds?: string | null;
  catalog_value_cents?: number | null;
  attributes?: Record<string, unknown>;
  image_url?: string | null;
  image_source?: string | null;
  is_placeholder?: boolean;
};

// Cajun Cardboard's published tier counts: Tier 1 = 27, Tier 4 = 216, total 378.
// Tiers 2 & 3 split the remaining 135 (45 / 90 here — adjust when the real list lands).
export const TIERS: Tier[] = [
  { id: 1, name: "The Pinnacle", slug: "pinnacle", rank: 1, targetCount: 27,
    description: "The grails — the rarest, most iconic Jordan cards. Serial-numbered greats and 1:1000+ inserts." },
  { id: 2, name: "Elite", slug: "elite", rank: 2, targetCount: 45,
    description: "High-end staples just below the grails — tough inserts, premium parallels, and key autos." },
  { id: 3, name: "Core", slug: "core", rank: 3, targetCount: 90,
    description: "Collector favorites — iconic, recognizable cards that are more attainable." },
  { id: 4, name: "Foundation", slug: "foundation", rank: 4, targetCount: 216,
    description: "The base of the hierarchy — desirable but more common inserts, parallels, and base cards." },
];

// Curated, genuinely real MJ cards. Metadata kept to what is reasonably documented;
// print runs / odds only where confidently known. image_url is null until a stable,
// rights-cleared URL is supplied (the app shows a styled placeholder meanwhile, and
// degrades back to it if a URL fails to load). Add URLs here or via Supabase Studio.
export const CURATED_CARDS: SeedCard[] = [
  // ---- Tier 1: The Pinnacle ----
  { name: "1986 Fleer Michael Jordan RC", tier_id: 1, setName: "1986-87 Fleer", year: 1986, manufacturer: "Fleer", card_number: "57", is_rookie: true },
  { name: "1986 Fleer Sticker", tier_id: 1, setName: "1986-87 Fleer Stickers", year: 1986, manufacturer: "Fleer", card_number: "8", is_rookie: true },
  { name: "1984 Star Michael Jordan XRC", tier_id: 1, setName: "1984-85 Star", year: 1985, manufacturer: "Star", card_number: "101", is_rookie: true },
  { name: "1997 Metal Universe Precious Metal Gems Green", tier_id: 1, setName: "1997-98 Metal Universe", year: 1997, manufacturer: "Fleer", card_number: "23", is_insert: true, is_parallel: true, serial_numbered: true, print_run: 100 },
  { name: "1997 Metal Universe Precious Metal Gems Red", tier_id: 1, setName: "1997-98 Metal Universe", year: 1997, manufacturer: "Fleer", card_number: "23", is_insert: true, is_parallel: true, serial_numbered: true, print_run: 10 },
  { name: "1997 Flair Showcase Legacy Collection Row 0 Jambalaya", tier_id: 1, setName: "1997-98 Flair Showcase", year: 1997, manufacturer: "Fleer", is_insert: true, pack_odds: "1:1500" },
  { name: "1996 Ultra Stars Gold Medallion", tier_id: 1, setName: "1996-97 Fleer Ultra", year: 1996, manufacturer: "Fleer", is_insert: true, is_parallel: true },
  { name: "1998 E-X Century Essential Credentials Future", tier_id: 1, setName: "1998-99 E-X Century", year: 1998, manufacturer: "SkyBox", is_insert: true, serial_numbered: true, print_run: 1 },
  { name: "1998 E-X Century Essential Credentials Now", tier_id: 1, setName: "1998-99 E-X Century", year: 1998, manufacturer: "SkyBox", is_insert: true, serial_numbered: true, print_run: 84 },
  { name: "2003 Upper Deck Exquisite Collection Patch Auto", tier_id: 1, setName: "2003-04 UD Exquisite", year: 2003, manufacturer: "Upper Deck", is_insert: true, serial_numbered: true, print_run: 100 },
  { name: "1997 SkyBox E-X2001 Jambalaya", tier_id: 1, setName: "1997-98 E-X2001", year: 1997, manufacturer: "SkyBox", is_insert: true },
  { name: "1993 Finest Refractor", tier_id: 1, setName: "1993-94 Finest", year: 1993, manufacturer: "Topps", card_number: "1", is_insert: true, is_parallel: true, print_run: 241 },
  { name: "1986 Star Court Kings", tier_id: 1, setName: "1985-86 Star Court Kings", year: 1986, manufacturer: "Star", card_number: "26" },

  // ---- Tier 2: Elite ----
  { name: "1997 Metal Universe Championship", tier_id: 2, setName: "1997-98 Metal Universe", year: 1997, manufacturer: "Fleer", card_number: "23", is_insert: true },
  { name: "1995 Flair Hot Numbers", tier_id: 2, setName: "1995-96 Flair", year: 1995, manufacturer: "Fleer", is_insert: true },
  { name: "1996 SkyBox E-X2000 Credentials", tier_id: 2, setName: "1996-97 E-X2000", year: 1996, manufacturer: "SkyBox", is_insert: true, serial_numbered: true, print_run: 499 },
  { name: "1998 SkyBox Molten Metal Fusion", tier_id: 2, setName: "1998-99 Molten Metal", year: 1998, manufacturer: "SkyBox", is_insert: true },
  { name: "1996 Topps Chrome Refractor", tier_id: 2, setName: "1996-97 Topps Chrome", year: 1996, manufacturer: "Topps", card_number: "139", is_insert: true, is_parallel: true },
  { name: "1998 Ultra Platinum Medallion", tier_id: 2, setName: "1998-99 Fleer Ultra", year: 1998, manufacturer: "Fleer", is_parallel: true, serial_numbered: true, print_run: 98 },
  { name: "1997 Skybox Premium Star Rubies", tier_id: 2, setName: "1997-98 SkyBox Premium", year: 1997, manufacturer: "SkyBox", is_parallel: true, serial_numbered: true, print_run: 50 },
  { name: "1994 Flair Scoring Power", tier_id: 2, setName: "1994-95 Flair", year: 1994, manufacturer: "Fleer", is_insert: true },
  { name: "1996 Stadium Club Finest Reprint Refractor", tier_id: 2, setName: "1996-97 Stadium Club", year: 1996, manufacturer: "Topps", is_insert: true, is_parallel: true },

  // ---- Tier 3: Core ----
  { name: "1990 SkyBox", tier_id: 3, setName: "1990-91 SkyBox", year: 1990, manufacturer: "SkyBox", card_number: "41" },
  { name: "1991 Fleer", tier_id: 3, setName: "1991-92 Fleer", year: 1991, manufacturer: "Fleer", card_number: "29" },
  { name: "1992 Upper Deck", tier_id: 3, setName: "1992-93 Upper Deck", year: 1992, manufacturer: "Upper Deck", card_number: "23" },
  { name: "1996 Topps Chrome", tier_id: 3, setName: "1996-97 Topps Chrome", year: 1996, manufacturer: "Topps", card_number: "139" },
  { name: "1995 Topps Spark Plug", tier_id: 3, setName: "1995-96 Topps", year: 1995, manufacturer: "Topps", is_insert: true },
  { name: "1989 Fleer", tier_id: 3, setName: "1989-90 Fleer", year: 1989, manufacturer: "Fleer", card_number: "21" },
  { name: "1990 Fleer", tier_id: 3, setName: "1990-91 Fleer", year: 1990, manufacturer: "Fleer", card_number: "26" },
  { name: "1992 Stadium Club Beam Team", tier_id: 3, setName: "1992-93 Stadium Club", year: 1992, manufacturer: "Topps", is_insert: true },
  { name: "1993 Topps Finest Main Attraction", tier_id: 3, setName: "1993-94 Finest", year: 1993, manufacturer: "Topps", is_insert: true },
  { name: "1995 Upper Deck Electric Court", tier_id: 3, setName: "1995-96 Upper Deck", year: 1995, manufacturer: "Upper Deck", is_parallel: true },
  { name: "1996 Fleer Metal", tier_id: 3, setName: "1996-97 Metal", year: 1996, manufacturer: "Fleer", card_number: "92" },
  { name: "1998 Upper Deck", tier_id: 3, setName: "1998-99 Upper Deck", year: 1998, manufacturer: "Upper Deck", card_number: "230" },

  // ---- Tier 4: Foundation ----
  { name: "1987 Fleer", tier_id: 4, setName: "1987-88 Fleer", year: 1987, manufacturer: "Fleer", card_number: "59" },
  { name: "1988 Fleer", tier_id: 4, setName: "1988-89 Fleer", year: 1988, manufacturer: "Fleer", card_number: "17" },
  { name: "1989 Hoops", tier_id: 4, setName: "1989-90 Hoops", year: 1989, manufacturer: "Hoops", card_number: "200" },
  { name: "1990 Hoops", tier_id: 4, setName: "1990-91 Hoops", year: 1990, manufacturer: "Hoops", card_number: "65" },
  { name: "1991 Upper Deck", tier_id: 4, setName: "1991-92 Upper Deck", year: 1991, manufacturer: "Upper Deck", card_number: "44" },
  { name: "1992 Fleer", tier_id: 4, setName: "1992-93 Fleer", year: 1992, manufacturer: "Fleer", card_number: "32" },
  { name: "1993 Upper Deck", tier_id: 4, setName: "1993-94 Upper Deck", year: 1993, manufacturer: "Upper Deck", card_number: "23" },
  { name: "1994 Upper Deck", tier_id: 4, setName: "1994-95 Upper Deck", year: 1994, manufacturer: "Upper Deck", card_number: "402" },
  { name: "1996 Topps", tier_id: 4, setName: "1996-97 Topps", year: 1996, manufacturer: "Topps", card_number: "139" },
  { name: "1996 Fleer", tier_id: 4, setName: "1996-97 Fleer", year: 1996, manufacturer: "Fleer", card_number: "13" },
  { name: "1997 Upper Deck", tier_id: 4, setName: "1997-98 Upper Deck", year: 1997, manufacturer: "Upper Deck", card_number: "230" },
  { name: "1998 Fleer Tradition", tier_id: 4, setName: "1998-99 Fleer", year: 1998, manufacturer: "Fleer", card_number: "23" },
  { name: "1991 Hoops", tier_id: 4, setName: "1991-92 Hoops", year: 1991, manufacturer: "Hoops", card_number: "30" },
  { name: "1992 SkyBox", tier_id: 4, setName: "1992-93 SkyBox", year: 1992, manufacturer: "SkyBox", card_number: "31" },
  { name: "1993 Fleer", tier_id: 4, setName: "1993-94 Fleer", year: 1993, manufacturer: "Fleer", card_number: "28" },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function cardSlug(
  c: { name: string; card_number?: string; tier_id: number },
  index: number,
  prefix = "" // namespace per catalog (e.g. "kobe") so slugs never collide across players
): string {
  const base = slugify(c.name) || `card-${c.tier_id}`;
  const num = c.card_number ? `-${slugify(c.card_number)}` : "";
  return `${prefix ? `${prefix}-` : ""}${base}${num}-${index}`;
}

// Pads each tier with clearly-labeled placeholder cards up to its target count.
export function generateFiller(): SeedCard[] {
  const out: SeedCard[] = [];
  for (const tier of TIERS) {
    const existing = CURATED_CARDS.filter((c) => c.tier_id === tier.id).length;
    const needed = tier.targetCount - existing;
    for (let i = 1; i <= needed; i++) {
      out.push({
        name: `${tier.name} card #${i} (TBD)`,
        tier_id: tier.id,
        setName: "Unassigned",
        year: 1990,
        manufacturer: "TBD",
        is_placeholder: true,
      });
    }
  }
  return out;
}

export function allSeedCards(): SeedCard[] {
  return [...CURATED_CARDS, ...generateFiller()];
}
