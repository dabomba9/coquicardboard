// Affiliate link helpers. Outbound "buy/find this card" links are wrapped with
// eBay Partner Network (EPN) tracking when a campaign id is configured, so the
// card pages become a monetized funnel. Falls back to a plain search URL when
// unset, so nothing breaks before/without an EPN account.
//
// Set NEXT_PUBLIC_EBAY_CAMPID (your EPN campaign id) to enable. Optionally
// NEXT_PUBLIC_EBAY_MKRID (rotation id; defaults to the US value).

const CAMPID = process.env.NEXT_PUBLIC_EBAY_CAMPID;
const MKRID = process.env.NEXT_PUBLIC_EBAY_MKRID ?? "711-53200-19255-0"; // US default

function ebayUrl(query: string, customId: string | undefined, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ _nkw: query, ...(extra ?? {}) });
  if (CAMPID) {
    params.set("mkcid", "1");
    params.set("mkrid", MKRID);
    params.set("siteid", "0");
    params.set("campid", CAMPID);
    params.set("toolid", "10001");
    params.set("mkevt", "1");
    if (customId) params.set("customid", customId);
  }
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

/**
 * eBay search URL for a card (active listings). Adds EPN affiliate params when
 * NEXT_PUBLIC_EBAY_CAMPID is set; `customId` (e.g. the card slug) flows through to
 * EPN reporting.
 */
export function ebaySearchUrl(query: string, customId?: string): string {
  return ebayUrl(query, customId);
}

/** eBay SOLD/completed listings — real recent comps for the card. */
export function ebaySoldUrl(query: string, customId?: string): string {
  return ebayUrl(query, customId, { LH_Sold: "1", LH_Complete: "1" });
}

/**
 * SportsCardsPro price-guide search for a card. A plain reference link (no
 * affiliate program, no tracking): their ToS lets us cite/link their prices
 * with attribution, but not import or display their data — so we only deep-link.
 */
export function sportsCardsProUrl(query: string): string {
  const params = new URLSearchParams({ q: query, type: "prices" });
  return `https://www.sportscardspro.com/search-products?${params.toString()}`;
}

/** True when affiliate tracking is active — use to pick rel="sponsored" vs "noreferrer". */
export const affiliateEnabled = Boolean(CAMPID);

/** rel attribute for outbound shopping links (sponsored when monetized). */
export const outboundRel = affiliateEnabled ? "sponsored noopener noreferrer" : "noreferrer";
