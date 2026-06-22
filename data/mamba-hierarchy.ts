// The Mamba Hierarchy — a curated, career-spanning ranking of Kobe Bryant's most
// significant cards into 3 tiers. There is NO published Kobe hierarchy (Cajun
// Cardboard's "Mamba Origins" is explicitly NOT a hierarchy), so this is our own
// curation by value / demand / scarcity / aesthetics — the same factors used for the
// Michael Jordan Hierarchy. Rookie identities come from the Mamba Origins checklist;
// modern grails are pulled from the Kobe Vault (TCDB) so the names are real.
//
// Tiers + assignments are a judgment call and easy to adjust.
import type { SeedCard } from "./catalog";

export type MambaTier = { id: number; name: string; slug: string; rank: number; description: string };

export const MAMBA_TIERS: MambaTier[] = [
  { id: 1, name: "Black Mamba", slug: "black-mamba", rank: 1,
    description: "The grails — Kobe's most coveted, valuable, and iconic cards." },
  { id: 2, name: "Mamba Mentality", slug: "mamba-mentality", rank: 2,
    description: "Elite chase cards — premium rookies, key autographs, and iconic inserts." },
  { id: 3, name: "Foundation", slug: "foundation", rank: 3,
    description: "The foundation — attainable but essential Kobe cards every collection is built on." },
];

type Row = {
  name: string; year: number; set: string; mfr: string; num?: string;
  tier: number; rc?: boolean; insert?: boolean; parallel?: boolean; serial?: number;
};

// name is the full descriptive card name; set/mfr drive the set + manufacturer facets.
const CARDS: Row[] = [
  // ───────────────────────── Tier 1 — Black Mamba (grails) ─────────────────────────
  { name: "1996-97 Topps Chrome Refractor #138 Kobe Bryant RC", year: 1996, set: "1996-97 Topps Chrome", mfr: "Topps", num: "138", tier: 1, rc: true, parallel: true },
  { name: "1996-97 Topps Chrome #138 Kobe Bryant RC", year: 1996, set: "1996-97 Topps Chrome", mfr: "Topps", num: "138", tier: 1, rc: true },
  { name: "1996-97 Bowman's Best Atomic Refractor #R23 Kobe Bryant RC", year: 1996, set: "1996-97 Bowman's Best", mfr: "Topps", num: "R23", tier: 1, rc: true, parallel: true },
  { name: "1996-97 Finest Refractor #74 Bronze Kobe Bryant RC", year: 1996, set: "1996-97 Finest", mfr: "Topps", num: "74", tier: 1, rc: true, parallel: true },
  { name: "1996-97 Flair Showcase Legacy Collection Row 0 #31 Kobe Bryant RC", year: 1996, set: "1996-97 Flair Showcase", mfr: "Fleer", num: "31", tier: 1, rc: true, parallel: true, serial: 150 },
  { name: "1996-97 E-X2000 Star Date 2000 #3 Kobe Bryant", year: 1996, set: "1996-97 E-X2000", mfr: "SkyBox", num: "3", tier: 1, rc: true, insert: true },
  { name: "1996-97 SkyBox Z-Force Zebut Z-peat #3 Kobe Bryant RC", year: 1996, set: "1996-97 SkyBox Z-Force", mfr: "SkyBox", num: "3", tier: 1, rc: true, parallel: true },
  { name: "1996-97 SkyBox Premium Star Rubies #203 Kobe Bryant RC", year: 1996, set: "1996-97 SkyBox Premium", mfr: "SkyBox", num: "203", tier: 1, rc: true, parallel: true },
  { name: "1996-97 Metal Precious Metal #181 Kobe Bryant RC", year: 1996, set: "1996-97 Metal", mfr: "Fleer", num: "181", tier: 1, rc: true, parallel: true },
  { name: "1996-97 SP #134 Kobe Bryant RC", year: 1996, set: "1996-97 SP", mfr: "Upper Deck", num: "134", tier: 1, rc: true },
  { name: "2003-04 Upper Deck Exquisite Collection Emblems of Endorsement #EM-KB Kobe Bryant Auto /15", year: 2003, set: "2003-04 UD Exquisite Collection", mfr: "Upper Deck", num: "EM-KB", tier: 1, insert: true, serial: 15 },
  { name: "2006-07 Upper Deck Exquisite Collection Logoman Autographs Dual Magic/Kobe 1/1", year: 2006, set: "2006-07 UD Exquisite Collection", mfr: "Upper Deck", num: "ADL-MK", tier: 1, insert: true, serial: 1 },
  { name: "2012-13 Panini Immaculate Collection Autographed Patches #AP-KB Kobe Bryant Auto /100", year: 2012, set: "2012-13 Panini Immaculate", mfr: "Panini", num: "AP-KB", tier: 1, insert: true, serial: 100 },
  { name: "2013-14 Panini Flawless Patch Autographs #PA-KB Kobe Bryant Auto /25", year: 2013, set: "2013-14 Panini Flawless", mfr: "Panini", num: "PA-KB", tier: 1, insert: true, serial: 25 },
  { name: "2016-17 Panini National Treasures Signatures #13 Kobe Bryant Auto /35", year: 2016, set: "2016-17 Panini National Treasures", mfr: "Panini", num: "13", tier: 1, insert: true, serial: 35 },
  { name: "2012-13 Panini Prizm Downtown Bound #6 Kobe Bryant", year: 2012, set: "2012-13 Panini Prizm", mfr: "Panini", num: "6", tier: 1, insert: true },

  // ──────────────────── Tier 2 — Mamba Mentality (elite chase) ────────────────────
  { name: "1996-97 Bowman's Best #R23 Kobe Bryant RC", year: 1996, set: "1996-97 Bowman's Best", mfr: "Topps", num: "R23", tier: 2, rc: true },
  { name: "1996-97 Finest #74 Bronze Kobe Bryant RC", year: 1996, set: "1996-97 Finest", mfr: "Topps", num: "74", tier: 2, rc: true },
  { name: "1996-97 Topps Chrome Youthquake #YQ15 Kobe Bryant", year: 1996, set: "1996-97 Topps Chrome", mfr: "Topps", num: "YQ15", tier: 2, insert: true },
  { name: "1996-97 Fleer #203 Kobe Bryant RC", year: 1996, set: "1996-97 Fleer", mfr: "Fleer", num: "203", tier: 2, rc: true },
  { name: "1996-97 Ultra #52 Kobe Bryant RC", year: 1996, set: "1996-97 Ultra", mfr: "Fleer", num: "52", tier: 2, rc: true },
  { name: "1996-97 Ultra Gold Medallion #G-52 Kobe Bryant RC", year: 1996, set: "1996-97 Ultra", mfr: "Fleer", num: "G-52", tier: 2, rc: true, parallel: true },
  { name: "1996-97 Metal #181 Kobe Bryant RC", year: 1996, set: "1996-97 Metal", mfr: "Fleer", num: "181", tier: 2, rc: true },
  { name: "1996-97 E-X2000 #30 Kobe Bryant RC", year: 1996, set: "1996-97 E-X2000", mfr: "SkyBox", num: "30", tier: 2, rc: true },
  { name: "1996-97 SkyBox Z-Force Zebut #3 Kobe Bryant", year: 1996, set: "1996-97 SkyBox Z-Force", mfr: "SkyBox", num: "3", tier: 2, insert: true },
  { name: "1996-97 Stadium Club Members Only 55 #52 Kobe Bryant RC", year: 1996, set: "1996-97 Stadium Club", mfr: "Topps", num: "52", tier: 2, rc: true, parallel: true },
  { name: "1996-97 SP #134 Premier Prospects Kobe Bryant RC", year: 1996, set: "1996-97 SP", mfr: "Upper Deck", num: "134", tier: 2, rc: true },
  { name: "1996-97 Upper Deck #58 Kobe Bryant RC", year: 1996, set: "1996-97 Upper Deck", mfr: "Upper Deck", num: "58", tier: 2, rc: true },
  { name: "1996-97 Collector's Choice #267 Kobe Bryant RC", year: 1996, set: "1996-97 Collector's Choice", mfr: "Upper Deck", num: "267", tier: 2, rc: true },
  { name: "1996-97 Hoops #281 Kobe Bryant RC", year: 1996, set: "1996-97 Hoops", mfr: "Hoops", num: "281", tier: 2, rc: true },
  { name: "1996 Press Pass Autographs #NNO Kobe Bryant Auto", year: 1996, set: "1996 Press Pass", mfr: "Press Pass", num: "NNO", tier: 2, insert: true },
  { name: "1996 Score Board Autographed Autographs #NNO Kobe Bryant Auto", year: 1996, set: "1996 Score Board", mfr: "Score Board", num: "NNO", tier: 2, insert: true },
  { name: "2003-04 Upper Deck Exquisite Collection Limited Logos #LL-KB Kobe Bryant Auto /75", year: 2003, set: "2003-04 UD Exquisite Collection", mfr: "Upper Deck", num: "LL-KB", tier: 2, insert: true, serial: 75 },
  { name: "2003-04 Upper Deck Exquisite Collection Noble Nameplates #NN-KB Kobe Bryant Auto /25", year: 2003, set: "2003-04 UD Exquisite Collection", mfr: "Upper Deck", num: "NN-KB", tier: 2, insert: true, serial: 25 },
  { name: "2005-06 Topps Chrome Hardwood Heroics Refractors #HH-KB Kobe Bryant /99", year: 2005, set: "2005-06 Topps Chrome", mfr: "Topps", num: "HH-KB", tier: 2, insert: true, serial: 99 },
  { name: "2015-16 Panini Flawless Star Swatch Signatures #SR-KB Kobe Bryant Auto /25", year: 2015, set: "2015-16 Panini Flawless", mfr: "Panini", num: "SR-KB", tier: 2, insert: true, serial: 25 },
  { name: "2007-08 Topps Chrome Refractor #24 Kobe Bryant", year: 2007, set: "2007-08 Topps Chrome", mfr: "Topps", num: "24", tier: 2, parallel: true },
  { name: "2012-13 Panini Prizm Downtown Bound Prizms #6 Kobe Bryant", year: 2012, set: "2012-13 Panini Prizm", mfr: "Panini", num: "6", tier: 2, insert: true, parallel: true },
  { name: "2014-15 Panini Prizm Prizms Gold #15 Kobe Bryant /10", year: 2014, set: "2014-15 Panini Prizm", mfr: "Panini", num: "15", tier: 2, parallel: true, serial: 10 },
  { name: "2019-20 Panini Mosaic #8 Kobe Bryant", year: 2019, set: "2019-20 Panini Mosaic", mfr: "Panini", num: "8", tier: 2 },

  // ──────────────────────── Tier 3 — Foundation (essential) ────────────────────────
  { name: "1996-97 Topps NBA at 50 #138 Kobe Bryant RC", year: 1996, set: "1996-97 Topps", mfr: "Topps", num: "138", tier: 3, rc: true, parallel: true },
  { name: "1996-97 Topps #138 Kobe Bryant RC", year: 1996, set: "1996-97 Topps", mfr: "Topps", num: "138", tier: 3, rc: true },
  { name: "1996-97 Fleer Rookie Sensations #3 Kobe Bryant", year: 1996, set: "1996-97 Fleer", mfr: "Fleer", num: "3", tier: 3, insert: true },
  { name: "1996-97 Ultra All-Rookies #3 Kobe Bryant", year: 1996, set: "1996-97 Ultra", mfr: "Fleer", num: "3", tier: 3, insert: true },
  { name: "1996-97 Ultra Fresh Faces #3 Kobe Bryant", year: 1996, set: "1996-97 Ultra", mfr: "Fleer", num: "3", tier: 3, insert: true },
  { name: "1996-97 Metal Cyber-Metal #5 Kobe Bryant", year: 1996, set: "1996-97 Metal", mfr: "Fleer", num: "5", tier: 3, insert: true },
  { name: "1996-97 Metal Freshly Forged #3 Kobe Bryant", year: 1996, set: "1996-97 Metal", mfr: "Fleer", num: "3", tier: 3, insert: true },
  { name: "1996-97 Flair Showcase Row 1 #31 Kobe Bryant RC", year: 1996, set: "1996-97 Flair Showcase", mfr: "Fleer", num: "31", tier: 3, rc: true },
  { name: "1996-97 Flair Showcase Row 2 #31 Kobe Bryant RC", year: 1996, set: "1996-97 Flair Showcase", mfr: "Fleer", num: "31", tier: 3, rc: true },
  { name: "1996-97 Flair Showcase Class of '96 #4 Kobe Bryant", year: 1996, set: "1996-97 Flair Showcase", mfr: "Fleer", num: "4", tier: 3, insert: true },
  { name: "1996-97 SkyBox Premium #55 Kobe Bryant RC", year: 1996, set: "1996-97 SkyBox Premium", mfr: "SkyBox", num: "55", tier: 3, rc: true },
  { name: "1996-97 SkyBox Premium Rookie Prevue #R-3 Kobe Bryant", year: 1996, set: "1996-97 SkyBox Premium", mfr: "SkyBox", num: "R-3", tier: 3, insert: true },
  { name: "1996-97 SP Premium Collection #PC18 Kobe Bryant", year: 1996, set: "1996-97 SP", mfr: "Upper Deck", num: "PC18", tier: 3, insert: true },
  { name: "1996-97 Upper Deck Rookie Exclusives #R10 Kobe Bryant", year: 1996, set: "1996-97 Upper Deck", mfr: "Upper Deck", num: "R10", tier: 3, insert: true },
  { name: "1996-97 Upper Deck UD3 #19 Kobe Bryant RC", year: 1996, set: "1996-97 UD3", mfr: "Upper Deck", num: "19", tier: 3, rc: true },
  { name: "1996-97 Hoops Rookies #3 Kobe Bryant", year: 1996, set: "1996-97 Hoops", mfr: "Hoops", num: "3", tier: 3, insert: true },
  { name: "1996-97 Stadium Club Rookies 1 #R12 Kobe Bryant", year: 1996, set: "1996-97 Stadium Club", mfr: "Topps", num: "R12", tier: 3, insert: true },
  { name: "1996-97 Collector's Choice #361 Rookie Class Kobe Bryant RC", year: 1996, set: "1996-97 Collector's Choice", mfr: "Upper Deck", num: "361", tier: 3, rc: true },
  { name: "1996-97 Pacific Power #PP-6 Kobe Bryant RC", year: 1996, set: "1996-97 Pacific Power", mfr: "Pacific", num: "PP-6", tier: 3, rc: true },
  { name: "1996-97 Score Board Frontier Phone Card #9 Kobe Bryant /999", year: 1996, set: "1996 Score Board", mfr: "Score Board", num: "9", tier: 3, serial: 999 },
  { name: "1997-98 Topps Chrome #171 Kobe Bryant", year: 1997, set: "1997-98 Topps Chrome", mfr: "Topps", num: "171", tier: 3 },
  { name: "1997-98 Metal Universe Championship #23 Kobe Bryant", year: 1997, set: "1997-98 Metal Universe", mfr: "Fleer", num: "23", tier: 3, insert: true },
  { name: "1998-99 SkyBox Molten Metal #6 Kobe Bryant", year: 1998, set: "1998-99 SkyBox Molten Metal", mfr: "SkyBox", num: "6", tier: 3, insert: true },
  { name: "1999-00 SP Authentic #34 Kobe Bryant", year: 1999, set: "1999-00 SP Authentic", mfr: "Upper Deck", num: "34", tier: 3 },
  { name: "2000-01 Fleer Showcase #55 Kobe Bryant", year: 2000, set: "2000-01 Fleer Showcase", mfr: "Fleer", num: "55", tier: 3 },
  { name: "2001-02 Upper Deck MVP #74 Kobe Bryant", year: 2001, set: "2001-02 Upper Deck MVP", mfr: "Upper Deck", num: "74", tier: 3 },
  { name: "2003-04 Topps Chrome #36 Kobe Bryant", year: 2003, set: "2003-04 Topps Chrome", mfr: "Topps", num: "36", tier: 3 },
  { name: "2007-08 Topps #24 Kobe Bryant", year: 2007, set: "2007-08 Topps", mfr: "Topps", num: "24", tier: 3 },
  { name: "2008-09 Topps Chrome #168 Kobe Bryant", year: 2008, set: "2008-09 Topps Chrome", mfr: "Topps", num: "168", tier: 3 },
  { name: "2009-10 Panini #2 Kobe Bryant", year: 2009, set: "2009-10 Panini", mfr: "Panini", num: "2", tier: 3 },
  { name: "2012-13 Panini Prizm #24 Kobe Bryant", year: 2012, set: "2012-13 Panini Prizm", mfr: "Panini", num: "24", tier: 3 },
  { name: "2014-15 Panini Prizm #15 Kobe Bryant", year: 2014, set: "2014-15 Panini Prizm", mfr: "Panini", num: "15", tier: 3 },
  { name: "2015-16 Panini Prizm #156 Kobe Bryant", year: 2015, set: "2015-16 Panini Prizm", mfr: "Panini", num: "156", tier: 3 },
  { name: "2018-19 Panini Donruss Optic #16 Kobe Bryant", year: 2018, set: "2018-19 Panini Donruss Optic", mfr: "Panini", num: "16", tier: 3 },
  { name: "2019-20 Panini Donruss #16 Kobe Bryant", year: 2019, set: "2019-20 Panini Donruss", mfr: "Panini", num: "16", tier: 3 },
];

export function loadMambaHierarchy(): SeedCard[] {
  return CARDS.map((c): SeedCard => ({
    name: c.name,
    tier_id: c.tier,
    setName: c.set,
    year: c.year,
    manufacturer: c.mfr,
    card_number: c.num,
    is_rookie: !!c.rc,
    is_insert: !!c.insert,
    is_parallel: !!c.parallel,
    print_run: c.serial ?? null,
    serial_numbered: c.serial != null,
    pack_odds: null,
    attributes: {},
    image_url: null,
    image_source: null,
    is_placeholder: false,
  }));
}
