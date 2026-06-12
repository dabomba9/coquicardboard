// Minimal eBay Browse API client. Imported only by the admin Server Action and the
// bulk fetch script (never a Client Component). Secrets come from non-NEXT_PUBLIC_
// env vars, so they are never exposed to the browser. (No "server-only" guard here
// because the Node bulk script imports this outside the RSC environment.)
//
// Uses an OAuth2 client-credentials
// "application access token" — no user login. Set EBAY_CLIENT_ID / EBAY_CLIENT_SECRET
// (Production App ID + Cert ID from developer.ebay.com).

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const INSIGHTS_URL = "https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search";
const SCOPE = "https://api.ebay.com/oauth/api_scope";
// Marketplace Insights (sold comps) requires its own scope, grantable only after
// eBay approves the app for that restricted API.
const INSIGHTS_SCOPE = "https://api.ebay.com/oauth/api_scope/buy.marketplace.insights";

export class EbayNotConfiguredError extends Error {
  constructor() {
    super("eBay is not configured. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in .env.local.");
    this.name = "EbayNotConfiguredError";
  }
}

// Thrown when the app lacks Marketplace Insights access (not yet approved): the
// token request rejects the scope (invalid_scope) or the call returns 403.
export class EbayInsightsNoAccessError extends Error {
  constructor(detail?: string) {
    super(
      "eBay Marketplace Insights access not granted yet. Apply for the Marketplace " +
        "Insights API at developer.ebay.com (your Production keyset)." +
        (detail ? ` [${detail}]` : "")
    );
    this.name = "EbayInsightsNoAccessError";
  }
}

// One cached app token per OAuth scope (base browse scope vs insights scope).
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export function ebayConfigured(): boolean {
  return !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

async function getAppToken(scope: string = SCOPE): Promise<string> {
  if (!ebayConfigured()) throw new EbayNotConfiguredError();
  const now = Date.now();
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt > now + 60_000) return cached.token;

  const basic = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope }),
  });
  if (!res.ok) {
    const body = await res.text();
    // Requesting the insights scope before approval fails here with invalid_scope.
    if (scope === INSIGHTS_SCOPE && (res.status === 400 || /invalid_scope|insufficient/i.test(body))) {
      throw new EbayInsightsNoAccessError(`token ${res.status}`);
    }
    throw new Error(`eBay token error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(scope, { token: data.access_token, expiresAt: now + data.expires_in * 1000 });
  return data.access_token;
}

export type EbayImageResult = { imageUrl: string; title: string } | null;

// Returns the best listing image for a query, or null if no result/no image.
// (Query building lives in lib/image-search.ts, shared across providers.)
export async function searchEbay(query: string): Promise<EbayImageResult> {
  const token = await getAppToken();
  const url = `${SEARCH_URL}?${new URLSearchParams({
    q: query,
    limit: "5",
    category_ids: "212", // Sports Trading Cards
  })}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`eBay search error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    itemSummaries?: { title: string; image?: { imageUrl?: string }; thumbnailImages?: { imageUrl?: string }[] }[];
  };
  for (const item of data.itemSummaries ?? []) {
    const img = item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl;
    if (img) return { imageUrl: img, title: item.title };
  }
  return null;
}

// All listing images for a query (up to ~5) — candidates to try in order.
export async function searchEbayAll(query: string): Promise<{ imageUrl: string; title: string }[]> {
  const r = await searchEbay(query);
  return r ? [r] : [];
}

// Raw active listings (title + USD price in cents) for a query — the caller
// filters by title/grade and computes a median (see lib/ebay-match.ts).
export async function searchEbayListings(query: string): Promise<{ title: string; cents: number }[]> {
  const token = await getAppToken();
  const url = `${SEARCH_URL}?${new URLSearchParams({
    q: query,
    limit: "50",
    category_ids: "212",
    filter: "buyingOptions:{FIXED_PRICE|AUCTION}",
  })}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`eBay price search ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    itemSummaries?: { title?: string; price?: { value?: string; currency?: string } }[];
  };
  return (data.itemSummaries ?? [])
    .filter((i) => i.title && i.price?.currency === "USD" && i.price?.value)
    .map((i) => ({ title: i.title!, cents: Math.round(parseFloat(i.price!.value!) * 100) }))
    .filter((x) => Number.isFinite(x.cents) && x.cents > 0);
}

export type EbaySoldItem = { title: string; cents: number; soldDate: string | null };

// Real SOLD comps (last ~90 days) via the Marketplace Insights API. Returns each
// sold item's last sold price (USD cents) + date; the caller filters by title/grade
// and computes a median (lib/ebay-match.ts). Throws EbayInsightsNoAccessError until
// the app is approved for Marketplace Insights.
export async function searchEbaySoldItems(query: string): Promise<EbaySoldItem[]> {
  const token = await getAppToken(INSIGHTS_SCOPE);
  const url = `${INSIGHTS_URL}?${new URLSearchParams({
    q: query,
    limit: "50",
    category_ids: "212",
  })}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
  });
  if (res.status === 403) {
    throw new EbayInsightsNoAccessError(await res.text().then((b) => `403 ${b.slice(0, 120)}`).catch(() => "403"));
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`eBay sold search ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    itemSales?: { title?: string; lastSoldPrice?: { value?: string; currency?: string }; lastSoldDate?: string }[];
  };
  return (data.itemSales ?? [])
    .filter((i) => i.title && i.lastSoldPrice?.currency === "USD" && i.lastSoldPrice?.value)
    .map((i) => ({
      title: i.title!,
      cents: Math.round(parseFloat(i.lastSoldPrice!.value!) * 100),
      soldDate: i.lastSoldDate ?? null,
    }))
    .filter((x) => Number.isFinite(x.cents) && x.cents > 0);
}
