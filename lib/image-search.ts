// Provider-agnostic card-image search. One entry point used by the admin action
// and the bulk script; the provider is chosen by IMAGE_SEARCH_PROVIDER.
//   duckduckgo (default) — no keys, unofficial/brittle
//   ebay                 — official Browse API, needs EBAY_CLIENT_ID/SECRET
import { searchDuckDuckGo, searchDuckDuckGoAll } from "@/lib/providers/duckduckgo";
import { searchEbay, searchEbayAll } from "@/lib/ebay";

export type ImageResult = { imageUrl: string; title: string } | null;

export function activeProvider(): string {
  return (process.env.IMAGE_SEARCH_PROVIDER ?? "duckduckgo").toLowerCase();
}

// Maps a catalog to the player whose name should prefix image/price searches.
export function playerForCatalog(catalog: string | null | undefined): string {
  // Every Kobe catalog (rookies, vault, hierarchy) searches as Kobe Bryant.
  return catalog?.startsWith("kobe") || catalog === "mamba-hierarchy" ? "Kobe Bryant" : "Michael Jordan";
}

// Build a clean search query from a card name: drop trailing serial (/NN) and
// parentheticals, prefix the player (defaults to Jordan for the original catalogs).
export function buildQuery(cardName: string, player = "Michael Jordan"): string {
  const cleaned = cardName
    .replace(/\([^)]*\)/g, " ")
    .replace(/\/\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${player} ${cleaned}`.trim();
}

export async function searchCardImage(query: string): Promise<ImageResult> {
  switch (activeProvider()) {
    case "ebay":
      return searchEbay(query);
    case "duckduckgo":
    default:
      return searchDuckDuckGo(query);
  }
}

// Higher-level: prefer a PSA-graded scan (clean, consistent), fall back to a
// plain search if there's no PSA match.
export async function searchBestImage(name: string, player = "Michael Jordan"): Promise<ImageResult> {
  const base = buildQuery(name, player);
  for (const q of [`${base} PSA`, base]) {
    const r = await searchCardImage(q);
    if (r) return r;
  }
  return null;
}

async function searchAll(query: string): Promise<NonNullable<ImageResult>[]> {
  return activeProvider() === "ebay" ? searchEbayAll(query) : searchDuckDuckGoAll(query);
}

// Does a result title look like a card back / reverse? Skip these so we show
// fronts. (PSA slab scans are front-facing; "back"/"reverse" listings are not.)
const BACK_RE = /\b(back|reverse|rev\.?)\b/i;
export function isBackTitle(title: string): boolean {
  return BACK_RE.test(title);
}

// Ordered, de-duplicated candidate image URLs for a card. Prefers PSA-graded
// FRONT scans, then PSA, then a plain search; drops back/reverse results. The
// caller tries each until one downloads.
export async function searchImageCandidates(name: string, player = "Michael Jordan"): Promise<NonNullable<ImageResult>[]> {
  const base = buildQuery(name, player);
  const seen = new Set<string>();
  const out: NonNullable<ImageResult>[] = [];
  for (const q of [`${base} PSA front`, `${base} PSA`, base]) {
    for (const r of await searchAll(q)) {
      if (seen.has(r.imageUrl)) continue;
      if (isBackTitle(r.title)) continue; // skip obvious card backs
      seen.add(r.imageUrl);
      out.push(r);
    }
    if (out.length >= 12) break;
  }
  return out.slice(0, 12);
}
