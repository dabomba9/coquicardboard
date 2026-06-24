// Player configs for the generalized TCDB vault scraper (legends-vault/*). Each
// entry parameterizes the Kobe Vault pipeline for a different player + sport.
// Run any script with `--player <key>`.
export type PlayerConfig = {
  key: string;          // CLI key, e.g. "clemente"
  pid: number;          // TCDB person id
  name: string;         // "Roberto Clemente" (used to split the set name out of the card name)
  slugName: string;     // TCDB URL slug, "Roberto-Clemente"
  sport: string;        // "Baseball" — the /Images/Thumbs/<sport>/ path + Person.cfm sport
  catalog: string;      // app catalog string, "clemente-vault"
  slugPrefix: string;   // DB slug prefix to avoid collisions, "rc"
  startYear: number;    // first issue year to scrape (playing-era only)
  endYear: number;      // last issue year to scrape (inclusive)
};

// Playing-era issue-year ranges (per the user): cards issued during their careers,
// extended one year past their final season to catch the last contemporary card
// (e.g. 1973 Topps Clemente, issued just after his death).
export const PLAYERS: Record<string, PlayerConfig> = {
  clemente: { key: "clemente", pid: 1115, name: "Roberto Clemente", slugName: "Roberto-Clemente", sport: "Baseball", catalog: "clemente-vault", slugPrefix: "rc", startYear: 1955, endYear: 1973 },
  killebrew: { key: "killebrew", pid: 3103, name: "Harmon Killebrew", slugName: "Harmon-Killebrew", sport: "Baseball", catalog: "killebrew-vault", slugPrefix: "hk", startYear: 1954, endYear: 1976 },
};

export function getPlayer(argv: string[]): PlayerConfig {
  const i = argv.indexOf("--player");
  const key = i !== -1 ? argv[i + 1] : "";
  const p = PLAYERS[key];
  if (!p) { console.error(`Usage: --player <${Object.keys(PLAYERS).join("|")}>`); process.exit(1); }
  return p;
}
