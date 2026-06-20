// Pure helpers to filter eBay listing titles down to ones that genuinely match a
// given card + grade, so price medians aren't polluted by loosely-matched results.

const STOPWORDS = new Set([
  "the", "and", "of", "a", "michael", "jordan", "mj", "card", "qty", "ser", "h", "r",
  "row", "legacy", "collection", "edition", "nba", "basketball", "chicago", "bulls",
  "kobe", "bryant", "lakers", "los", "angeles",
]);

// Abbreviation → acceptable title substrings (any present = group satisfied).
const SYNONYMS: Record<string, string[]> = {
  pmg: ["pmg", "precious metal gems"],
  rc: ["rc", "rookie"],
  refractor: ["refractor", "refractors"],
  auto: ["auto", "autograph", "signature"],
};

export function extractYear(name: string): string | null {
  const m = name.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

// Distinctive token groups a matching title must ALL contain (each group = synonyms).
export function requiredTokenGroups(name: string): string[][] {
  const cleaned = name
    .toLowerCase()
    .replace(/\b(19|20)\d{2}(\/\d{2})?\b/g, " ") // years
    .replace(/#[a-z0-9-]+/g, " ")                // card numbers
    .replace(/\/\d+/g, " ")                       // serial /N
    .replace(/\([^)]*\)/g, " ")                   // parentheticals
    .replace(/\b(psa|bgs|sgc|cgc|csg|beckett)\b/g, " ") // grader tokens
    .replace(/[^a-z0-9.\s]/g, " ");

  const groups: string[][] = [];
  const seen = new Set<string>();
  for (const tok of cleaned.split(/\s+/)) {
    const t = tok.trim();
    if (t.length < 3 || STOPWORDS.has(t) || seen.has(t)) continue;
    seen.add(t);
    groups.push(SYNONYMS[t] ?? [t]);
  }
  return groups;
}

// Does a title satisfy the year + every distinctive token group?
export function matchesCard(title: string, year: string | null, groups: string[][]): boolean {
  const t = title.toLowerCase();
  if (year && !t.includes(year)) return false;
  return groups.every((g) => g.some((syn) => t.includes(syn)));
}

const GRADED_MARKER = /\b(psa|bgs|sgc|cgc|csg|beckett|gem\s?mt|graded|slab)\b/;

// For raw: exclude graded listings. For graded: require the matching grade token.
export function gradeMatches(title: string, gradeKey: string): boolean {
  const t = title.toLowerCase();
  if (gradeKey === "raw") return !GRADED_MARKER.test(t);
  const m = gradeKey.match(/^([A-Za-z]+)(\d+(?:\.\d+)?)$/);
  if (!m) return true;
  const grader = m[1].toLowerCase();
  const num = m[2].replace(".", "\\.");
  if (grader === "psa") return new RegExp(`psa\\s?${num}\\b`).test(t);
  if (grader === "bgs") return new RegExp(`(bgs|beckett)\\s?${num}\\b`).test(t);
  if (grader === "sgc") return new RegExp(`sgc\\s?${num}\\b`).test(t);
  return t.includes(num);
}

export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// Listings that pollute card-price medians: lots/multi-card, reprints, customs,
// repacks, group breaks, digital, damaged. Excluded before matching.
const JUNK = new RegExp(
  [
    "\\blots?\\b", "\\bset of\\b", "\\bbundle\\b", "\\brepack\\b", "\\bmystery\\b",
    "\\breprints?\\b", "\\brp\\b", "\\bproxy\\b", "\\bcustom\\b", "\\bnovelty\\b", "\\baceo\\b",
    "\\bdigital\\b", "\\bbreak\\b", "\\bcase\\b", "\\bspot\\b", "\\bread\\b",
    "\\bdamaged\\b", "\\bcreased\\b", "\\bmiscut\\b", "\\bpoor\\b",
    "\\bx\\s?\\d+\\b", "\\b\\d+\\s?x\\b", "\\(\\s?\\d+\\s?\\)", // x3 / 3x / (4) = quantities
  ].join("|"),
  "i"
);

export function isJunkTitle(title: string): boolean {
  return JUNK.test(title);
}

// Drop statistical outliers so one absurd listing can't skew the median.
// >=4 samples: Tukey IQR fence. 3 samples: keep within [0.2x, 5x] of the median.
export function trimOutliers(nums: number[]): number[] {
  if (nums.length < 3) return nums;
  const s = [...nums].sort((a, b) => a - b);
  if (s.length === 3) {
    const m = s[1];
    return s.filter((v) => v >= m * 0.2 && v <= m * 5);
  }
  const q = (p: number) => {
    const idx = (s.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
  };
  const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const kept = s.filter((v) => v >= lo && v <= hi);
  return kept.length ? kept : s;
}

// From raw listings, keep only confident matches and return a median if we have
// at least `minSamples`; otherwise null (caller keeps the existing/estimated price).
export function priceFromListings(
  listings: { title: string; cents: number }[],
  name: string,
  gradeKey: string,
  minSamples = 3
): { medianCents: number; count: number } | null {
  const year = extractYear(name);
  const groups = requiredTokenGroups(name);
  const matched = listings
    .filter((l) => l.cents > 0 && !isJunkTitle(l.title) && matchesCard(l.title, year, groups) && gradeMatches(l.title, gradeKey))
    .map((l) => l.cents);
  const cleaned = trimOutliers(matched);
  if (cleaned.length < minSamples) return null;
  return { medianCents: median(cleaned), count: cleaned.length };
}
