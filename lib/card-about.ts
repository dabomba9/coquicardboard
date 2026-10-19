// "About this card": a short paragraph built only from facts the catalog holds, so
// each card page says something specific about its card instead of repeating the
// same labels as 6,000 others. No filler: a sentence appears only when its fact
// exists, and nothing is estimated.

export type AboutInput = {
  name: string;
  year: number | null;
  cardNumber: string | null;
  setName: string | null; // vault: name before " #"; hierarchy: sets.name
  manufacturer: string | null;
  cardType: string | null; // Base / Insert / Parallel / Auto / Relic / Memorabilia…
  printRun: number | null;
  player: string;
  catalogLabel: string; // "Jordan Vault", "MJ Hierarchy"…
  setCount: number; // cards the catalog holds from this set, this one included (0 = unknown)
  tierName: string | null; // hierarchy cards only
  hasBack: boolean;
  price: { cents: number; sample: number | null; asOf: string | null } | null;
  lastCheckedNoListings: string | null; // ISO date of a "checked, nothing matched" marker
};

// The set a vault card belongs to, from its name: everything before " #<number>".
// "1998 Upper Deck Michael Jordan Living Legend #89 Michael Jordan" →
// "1998 Upper Deck Michael Jordan Living Legend". Null when the name has no number.
export function vaultSetName(name: string): string | null {
  const i = name.indexOf(" #");
  return i > 0 ? name.slice(0, i).trim() : null;
}

/** "#89" for "89", "##89" or "#89" — vault card numbers already carry the "#". */
export function formatCardNumber(n: string | null | undefined): string | null {
  const bare = (n ?? "").trim().replace(/^#+/, "");
  return bare ? `#${bare}` : null;
}

/** Print run from attributes, or from the name: "/50" or TCDB's "SN50". */
export function printRunFromName(name: string): number | null {
  const m = /(?:\/|\bSN)(\d{1,5})\b/.exec(name);
  return m ? Number(m[1]) : null;
}

const TYPE_PHRASE: Record<string, string> = {
  base: "a base-set card",
  insert: "an insert",
  parallel: "a parallel",
  auto: "an autograph card",
  autograph: "an autograph card",
  relic: "a memorabilia card",
  memorabilia: "a memorabilia card",
};

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export function aboutCard(a: AboutInput): string[] {
  const out: string[] = [];
  const num = formatCardNumber(a.cardNumber);
  const kind = a.cardType ? TYPE_PHRASE[a.cardType.toLowerCase()] : undefined;

  // Identity: set, number, year, maker.
  const where = a.setName ? `in ${a.setName}` : null;
  const made = [a.year ? String(a.year) : null, a.manufacturer].filter(Boolean).join(" ");
  if (where && num) out.push(`This is card ${num} ${where}${made && !a.setName?.toLowerCase().includes(made.toLowerCase()) ? `, a ${made} release` : ""}.`);
  else if (num && made) out.push(`This is card ${num} from ${made}.`);

  // What kind of card, and how scarce it is by design.
  const bits: string[] = [];
  if (kind) bits.push(`It's ${kind}`);
  if (a.printRun) bits.push(`${bits.length ? "serial numbered" : "It's serial numbered"} to ${a.printRun.toLocaleString("en-US")}`);
  if (bits.length) out.push(`${bits.join(", ")}.`);

  // Where it sits in the catalog.
  if (a.tierName) out.push(`It's ranked in the ${a.tierName} tier of the ${a.catalogLabel}.`);
  if (a.setName && a.setCount > 1) {
    out.push(`The ${a.catalogLabel} tracks ${a.setCount} ${a.player} cards from this set.`);
  }

  // Market, stated as observed — never estimated.
  if (a.price) {
    const n = a.price.sample ? ` across ${a.price.sample} listing${a.price.sample === 1 ? "" : "s"}` : "";
    out.push(`Raw copies were listed around ${usd(a.price.cents)} on eBay${n}${a.price.asOf ? ` as of ${day(a.price.asOf)}` : ""}.`);
  } else if (a.lastCheckedNoListings) {
    out.push(`When we checked eBay on ${day(a.lastCheckedNoListings)}, no listings matched this card.`);
  }

  if (a.hasBack) out.push("Both the front and the back are pictured.");
  return out;
}
