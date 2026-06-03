// Parses the authoritative MJ Hierarchy checklist CSV (exported from Cajun
// Cardboard's tracker — credited) into SeedCard[] for the seed script.
//
// CSV columns: Collected, Card Name, Tier, Type, Serial, Odds
// "Card Name" is freeform, e.g. "1997 Metal Universe PMG Green #23 /10".
// We derive year, card_number, set/manufacturer, print run, and flags from it.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { SeedCard } from "./catalog";

const CSV_PATH = path.join(process.cwd(), "data", "mj-hierarchy-checklist-2026-06-01.csv");

// Brand → manufacturer, most-specific first (matched against the name after the year).
const BRANDS: [string, string][] = [
  ["Metal Universe", "Fleer"],
  ["Flair Showcase", "Fleer"],
  ["Fleer Tradition", "Fleer"],
  ["Flair", "Fleer"],
  ["Ultra", "Fleer"],
  ["Metal", "Fleer"],
  ["Fleer", "Fleer"],
  ["E-X2001", "SkyBox"],
  ["E-X2000", "SkyBox"],
  ["E-X Century", "SkyBox"],
  ["E-XL", "SkyBox"],
  ["E-X", "SkyBox"],
  ["Skybox Premium", "SkyBox"],
  ["Skybox Thunder", "SkyBox"],
  ["Z-Force", "SkyBox"],
  ["Skybox", "SkyBox"],
  ["NBA Hoops", "Hoops"],
  ["Hoops", "Hoops"],
  ["SP Authentic", "Upper Deck"],
  ["SPx", "Upper Deck"],
  ["SP Premium", "Upper Deck"],
  ["SP", "Upper Deck"],
  ["UD Choice", "Upper Deck"],
  ["UD3", "Upper Deck"],
  ["Collector's Choice", "Upper Deck"],
  ["Upper Deck", "Upper Deck"],
  ["Topps Chrome", "Topps"],
  ["Topps Gallery", "Topps"],
  ["Bowman's Best", "Topps"],
  ["Bowman", "Topps"],
  ["Stadium Club", "Topps"],
  ["Finest", "Topps"],
  ["Topps", "Topps"],
  ["Star", "Star"],
  ["Pro Set", "Pro Set"],
  ["Action Packed", "Action Packed"],
  ["Nike", "Nike"],
  ["Prism", "Prism"],
  ["Interlake", "Interlake"],
  ["SkyBox", "SkyBox"],
];

// Minimal RFC-4180-ish CSV parser (handles quotes, escaped quotes, commas in fields).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.length) || rows.length) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function deriveSet(restAfterYear: string, year: number): { setName: string; manufacturer: string } {
  const lower = restAfterYear.toLowerCase();
  for (const [brand, mfr] of BRANDS) {
    if (lower.startsWith(brand.toLowerCase())) {
      return { setName: `${year} ${brand}`, manufacturer: mfr };
    }
  }
  // Fallback: words up to the first #, /, or ( token.
  const head = restAfterYear.split(/\s+/).slice(0, 2).filter((w) => !/^[#/(]/.test(w)).join(" ");
  return { setName: `${year} ${head || "Other"}`.trim(), manufacturer: "Other" };
}

export function loadChecklist(): SeedCard[] {
  const text = readFileSync(CSV_PATH, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => !l.startsWith("#")).join("\n");
  const rows = parseCsv(lines);
  const header = rows.shift()!; // Collected, Card Name, Tier, Type, Serial, Odds
  const idx = (name: string) => header.indexOf(name);
  const iName = idx("Card Name"), iTier = idx("Tier"), iType = idx("Type"),
    iSerial = idx("Serial"), iOdds = idx("Odds");

  return rows
    .filter((r) => r[iName]?.trim())
    .map((r): SeedCard => {
      const name = r[iName].trim();
      const tier_id = parseInt(r[iTier], 10) || 4;
      const type = (r[iType] || "").trim();
      const serial = (r[iSerial] || "").trim();
      const odds = (r[iOdds] || "").trim();

      const ym = name.match(/^(\d{4})(?:\/\d{2})?\s*(.*)$/);
      const year = ym ? parseInt(ym[1], 10) : 1990;
      const rest = ym ? ym[2] : name;

      const numMatch = rest.match(/#([A-Za-z0-9-]+)/);
      const card_number = numMatch ? numMatch[1] : undefined;

      const runMatch = serial.match(/\/(\d+)/);
      const print_run = runMatch ? parseInt(runMatch[1], 10) : null;

      const { setName, manufacturer } = deriveSet(rest, year);

      return {
        name,
        tier_id,
        setName,
        year,
        manufacturer,
        card_number,
        is_rookie: /\bRC\b/.test(name),
        is_insert: type.includes("Insert"),
        is_parallel: type.includes("Parallel"),
        print_run,
        serial_numbered: print_run != null,
        pack_odds: odds || null,
        attributes: { type },
        image_url: null,
        image_source: null,
        is_placeholder: false,
      };
    });
}
