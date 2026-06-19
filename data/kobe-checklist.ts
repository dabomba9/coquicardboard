// Parses the "Mamba Origins" checklist CSV — Bryan Denison's Kobe Bryant 1996-97
// Rookie Card list (Cajun Cardboard Creations, credited) — into SeedCard[] for the
// seed script. Simpler than the MJ loader because Brand is an explicit column, so
// the set/manufacturer doesn't have to be guessed from the card name.
//
// CSV columns: Collected, Card Name, Brand, Type, Serial, Auto, Licensed, Odds
import { readFileSync } from "node:fs";
import path from "node:path";
import type { SeedCard } from "./catalog";
import { parseCsv } from "./checklist";

const CSV_PATH = path.join(process.cwd(), "data", "mamba-origins-checklist-2026-06-19.csv");

// Mamba Origins groups by BRAND, not rarity tier. We still assign a 1–4 tier purely
// as a COSMETIC rarity (drives the card placeholder color + within-section sort) — it
// is never surfaced as "tiers" on the Kobe page. This is a display heuristic, not a
// hobby-authoritative ranking.
function deriveKobeRarity(type: string, auto: boolean, printRun: number | null): number {
  if (auto || (printRun != null && printRun <= 100)) return 1; // autos + ultra-low serials
  if (printRun != null && printRun <= 1000) return 2; // low serials
  if (printRun != null || type.includes("Insert") || type.includes("Parallel")) return 3;
  return 4; // base
}

export function loadKobeChecklist(): SeedCard[] {
  const text = readFileSync(CSV_PATH, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => !l.startsWith("#")).join("\n");
  const rows = parseCsv(lines);
  const header = rows.shift()!; // Collected, Card Name, Brand, Type, Serial, Auto, Licensed, Odds
  const idx = (name: string) => header.indexOf(name);
  const iName = idx("Card Name"), iBrand = idx("Brand"), iType = idx("Type"),
    iSerial = idx("Serial"), iAuto = idx("Auto"), iLicensed = idx("Licensed"), iOdds = idx("Odds");

  return rows
    .filter((r) => r[iName]?.trim())
    .map((r): SeedCard => {
      const name = r[iName].trim();
      const brand = (r[iBrand] || "").trim();
      const type = (r[iType] || "").trim();
      const serial = (r[iSerial] || "").trim();
      const auto = (r[iAuto] || "").trim() === "Yes";
      const licensed = (r[iLicensed] || "").trim() !== "No";
      const odds = (r[iOdds] || "").trim();

      const year = 1996; // the entire set is the 1996-97 rookie class

      const numMatch = name.match(/#([A-Za-z0-9-]+)/);
      const card_number = numMatch ? numMatch[1] : undefined;

      const runMatch = serial.match(/\/(\d+)/);
      const print_run = runMatch ? parseInt(runMatch[1], 10) : null;

      return {
        name,
        tier_id: deriveKobeRarity(type, auto, print_run),
        setName: `1996 ${brand}`,
        year,
        manufacturer: brand,
        card_number,
        is_rookie: true,
        is_insert: type.includes("Insert"),
        is_parallel: type.includes("Parallel"),
        print_run,
        serial_numbered: print_run != null,
        pack_odds: odds || null,
        attributes: { type, auto, licensed, brand },
        image_url: null,
        image_source: null,
        is_placeholder: false,
      };
    });
}
