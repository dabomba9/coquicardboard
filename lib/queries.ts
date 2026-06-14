import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CardWithSet, Holding, Tier, CardPrice, Profile, PublicCollection,
} from "@/lib/types";
import { valuePortfolioSeries, type PriceHistoryRow } from "@/lib/portfolio";

// ---- Cached catalog reads (global, non-user) ----
// These read world-readable catalog/price rows with the cookieless admin client
// (unstable_cache callbacks cannot call cookies()) and cache the result so Supabase
// isn't re-queried on every request. Per-user reads stay dynamic (see further down).
// Caches are invalidated by time (revalidate) and by the nightly cron via
// revalidateTag("catalog" | "prices" | "vault-catalog").

export const getTiersCached = unstable_cache(
  async (): Promise<Tier[]> => {
    const { data, error } = await createAdminClient().from("tiers").select("*").order("rank");
    if (error) throw error;
    return data as Tier[];
  },
  ["tiers"],
  { revalidate: 86400, tags: ["catalog"] }
);

export const getHierarchyCatalog = unstable_cache(
  async (): Promise<CardWithSet[]> => {
    const { data, error } = await createAdminClient()
      .from("cards")
      .select("*, sets(*)")
      .eq("catalog", "mj-hierarchy")
      .order("tier_id")
      .order("rarity_rank");
    if (error) throw error;
    return (data as CardWithSet[]) ?? [];
  },
  ["hierarchy-catalog"],
  { revalidate: 3600, tags: ["catalog"] }
);

export const getCatalogValueMapCached = unstable_cache(
  async (): Promise<[string, number][]> => {
    // Returned as entries (Map isn't serializable in the cache). Caller rebuilds the Map.
    const db = createAdminClient();
    const map = new Map<string, number>();
    const { data: cards } = await db.from("cards").select("id, catalog_value_cents").eq("catalog", "mj-hierarchy");
    for (const c of (cards as { id: string; catalog_value_cents: number | null }[]) ?? []) {
      if (c.catalog_value_cents != null) map.set(c.id, c.catalog_value_cents);
    }
    const { data: prices } = await db.from("card_prices").select("card_id, median_cents").eq("grade_key", "raw");
    for (const p of (prices as { card_id: string; median_cents: number | null }[]) ?? []) {
      if (p.median_cents != null) map.set(p.card_id, p.median_cents);
    }
    return [...map.entries()];
  },
  ["catalog-value-map"],
  { revalidate: 3600, tags: ["catalog", "prices"] }
);

// Full Jordan Vault catalog (slim fields). The vault page filters/sorts/paginates
// this in-memory server-side (lib/vault-filter.ts) — the browser only ever receives
// one 48-card page.
//
// NOT wrapped in unstable_cache: the ~12k rows (with the `attributes` blob) are
// ~6.5MB, far over unstable_cache's 2MB entry limit, which made the cache write
// reject and surface as an unhandledRejection on /vault. Instead we memoize in
// process with a TTL — no 2MB cap, and warm server instances skip the re-query.
// Per-instance on serverless; the catalog only changes on re-seed/reconcile, so
// brief staleness is fine.
let vaultCatalogCache: { at: number; rows: VaultRow[] } | null = null;
const VAULT_CATALOG_TTL_MS = 60 * 60 * 1000; // 1h

export async function getVaultCatalog(): Promise<VaultRow[]> {
  if (vaultCatalogCache && Date.now() - vaultCatalogCache.at < VAULT_CATALOG_TTL_MS) {
    return vaultCatalogCache.rows;
  }
  const db = createAdminClient();
  const out: VaultRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("cards")
      .select("id, slug, name, card_number, year, image_url, attributes")
      .eq("catalog", "mj-vault")
      .order("rarity_rank")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data as VaultRow[]) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  vaultCatalogCache = { at: Date.now(), rows: out };
  return out;
}

// Slim slug list for the sitemap (id+slug only). The full getVaultCatalog (~6.5MB
// with attributes) exceeds unstable_cache's 2MB ceiling, so the sitemap uses this
// lightweight cacheable list instead.
export const getVaultSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const db = createAdminClient();
    const out: string[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("cards")
        .select("slug")
        .eq("catalog", "mj-vault")
        .order("rarity_rank")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = (data as { slug: string }[]) ?? [];
      out.push(...rows.map((r) => r.slug));
      if (rows.length < PAGE) break;
    }
    return out;
  },
  ["vault-slugs"],
  { revalidate: 86400, tags: ["vault-catalog"] }
);

export const getCardBySlugCached = unstable_cache(
  async (slug: string): Promise<CardWithSet | null> => {
    const { data } = await createAdminClient().from("cards").select("*, sets(*)").eq("slug", slug).maybeSingle();
    return (data as CardWithSet) ?? null;
  },
  ["card-by-slug"],
  { revalidate: 3600, tags: ["catalog"] }
);

export const getCardPricesCached = unstable_cache(
  async (cardId: string): Promise<CardPrice[]> => {
    const { data } = await createAdminClient().from("card_prices").select("*").eq("card_id", cardId);
    return (data as CardPrice[]) ?? [];
  },
  ["card-prices"],
  { revalidate: 3600, tags: ["prices"] }
);

export const getPriceHistoryCached = unstable_cache(
  async (cardId: string): Promise<PriceSeries[]> => {
    const { data } = await createAdminClient()
      .from("price_history")
      .select("grade_key, value_cents, recorded_on")
      .eq("card_id", cardId)
      .order("recorded_on");
    const map = new Map<string, { date: string; value: number }[]>();
    for (const r of (data as { grade_key: string; value_cents: number; recorded_on: string }[]) ?? []) {
      if (!map.has(r.grade_key)) map.set(r.grade_key, []);
      map.get(r.grade_key)!.push({ date: r.recorded_on, value: r.value_cents });
    }
    const order = (g: string) => (g === "raw" ? 0 : g.startsWith("PSA10") ? 1 : g.startsWith("BGS") ? 2 : 3);
    return [...map.entries()]
      .map(([grade_key, points]) => ({ grade_key, points }))
      .sort((a, b) => order(a.grade_key) - order(b.grade_key));
  },
  ["price-history"],
  { revalidate: 3600, tags: ["prices"] }
);

export const getRelatedCardsCached = unstable_cache(
  async (setId: string, excludeId: string, limit = 12): Promise<CardWithSet[]> => {
    const { data } = await createAdminClient()
      .from("cards")
      .select("*, sets(*)")
      .eq("set_id", setId)
      .neq("id", excludeId)
      .order("rarity_rank")
      .limit(limit);
    return (data as CardWithSet[]) ?? [];
  },
  ["related-cards"],
  { revalidate: 3600, tags: ["catalog"] }
);

// Related Jordan Vault cards: same manufacturer (vault cards have no set_id), with
// the closest years surfaced first so a card's "siblings" feel coherent.
export const getRelatedVaultCardsCached = unstable_cache(
  async (manufacturer: string, year: number | null, excludeId: string, limit = 12): Promise<CardWithSet[]> => {
    const { data } = await createAdminClient()
      .from("cards")
      .select("*, sets(*)")
      .eq("catalog", "mj-vault")
      .eq("attributes->>manufacturer", manufacturer)
      .neq("id", excludeId)
      .order("rarity_rank")
      .limit(60);
    const rows = (data as CardWithSet[]) ?? [];
    if (year != null) {
      rows.sort((a, b) => Math.abs((a.year ?? 9999) - year) - Math.abs((b.year ?? 9999) - year));
    }
    return rows.slice(0, limit);
  },
  ["related-vault-cards"],
  { revalidate: 3600, tags: ["catalog"] }
);

// ---- Catalog (public, read-only) ----

export async function getTiers(): Promise<Tier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tiers").select("*").order("rank");
  if (error) throw error;
  return data as Tier[];
}

export async function getCardsByTier(): Promise<Record<number, CardWithSet[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*, sets(*)")
    .eq("catalog", "mj-hierarchy") // the 378-card hierarchy only; vault cards live under catalog='mj-vault'
    .order("tier_id")
    .order("rarity_rank");
  if (error) throw error;
  const grouped: Record<number, CardWithSet[]> = {};
  for (const c of (data as CardWithSet[]) ?? []) {
    (grouped[c.tier_id] ??= []).push(c);
  }
  return grouped;
}

export async function getAllCards(): Promise<CardWithSet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*, sets(*)")
    .eq("catalog", "mj-hierarchy") // hierarchy only
    .order("tier_id")
    .order("rarity_rank");
  if (error) throw error;
  return (data as CardWithSet[]) ?? [];
}

// Map cardId -> best value cents: raw card_prices median, else catalog_value_cents.
export async function getCatalogValueMap(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const map = new Map<string, number>();
  const { data: cards } = await supabase.from("cards").select("id, catalog_value_cents").eq("catalog", "mj-hierarchy");
  for (const c of (cards as { id: string; catalog_value_cents: number | null }[]) ?? []) {
    if (c.catalog_value_cents != null) map.set(c.id, c.catalog_value_cents);
  }
  const { data: prices } = await supabase
    .from("card_prices")
    .select("card_id, median_cents")
    .eq("grade_key", "raw");
  for (const p of (prices as { card_id: string; median_cents: number | null }[]) ?? []) {
    if (p.median_cents != null) map.set(p.card_id, p.median_cents);
  }
  return map;
}

export type PriceSeries = { grade_key: string; points: { date: string; value: number }[] };

export async function getPriceHistory(cardId: string): Promise<PriceSeries[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_history")
    .select("grade_key, value_cents, recorded_on")
    .eq("card_id", cardId)
    .order("recorded_on");
  const map = new Map<string, { date: string; value: number }[]>();
  for (const r of (data as { grade_key: string; value_cents: number; recorded_on: string }[]) ?? []) {
    if (!map.has(r.grade_key)) map.set(r.grade_key, []);
    map.get(r.grade_key)!.push({ date: r.recorded_on, value: r.value_cents });
  }
  // raw first, then graded high→low
  const order = (g: string) => (g === "raw" ? 0 : g.startsWith("PSA10") ? 1 : g.startsWith("BGS") ? 2 : 3);
  return [...map.entries()]
    .map(([grade_key, points]) => ({ grade_key, points }))
    .sort((a, b) => order(a.grade_key) - order(b.grade_key));
}

// Portfolio value over time: value the user's CURRENT holdings at each historical
// month. Thin DB wrapper around the pure `valuePortfolioSeries` (lib/portfolio.ts).
export async function getPortfolioSeries(holdings: Holding[]): Promise<{ date: string; value: number }[]> {
  const cardIds = [...new Set(holdings.map((h) => h.card_id))];
  if (cardIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_history")
    .select("card_id, grade_key, value_cents, recorded_on")
    .in("card_id", cardIds);
  return valuePortfolioSeries(holdings, (data as PriceHistoryRow[]) ?? []);
}

// Distinct number of collectors who own this card. Uses the server-only
// service-role client to read across users (RLS-bypassing), returning ONLY an
// aggregate count — no identities. Safe for a public page.
export async function getCardOwnerCount(cardId: string): Promise<number> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin.from("holdings").select("user_id").eq("card_id", cardId);
  return new Set(((data as { user_id: string }[]) ?? []).map((r) => r.user_id)).size;
}

export async function getRelatedCards(setId: string, excludeId: string, limit = 12): Promise<CardWithSet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cards")
    .select("*, sets(*)")
    .eq("set_id", setId)
    .neq("id", excludeId)
    .order("rarity_rank")
    .limit(limit);
  return (data as CardWithSet[]) ?? [];
}

// All Jordan Vault cards (catalog='mj-vault'). PostgREST caps a select at 1000
// rows, so page through the ~12k in chunks. Returns the slim fields the explorer
// needs (vault metadata lives in `attributes`).
export type VaultRow = {
  id: string;
  slug: string;
  name: string | null;
  card_number: string | null;
  year: number | null;
  image_url: string | null;
  attributes: Record<string, unknown>;
};
export async function getVaultCards(): Promise<VaultRow[]> {
  const supabase = await createClient();
  const out: VaultRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("cards")
      .select("id, slug, name, card_number, year, image_url, attributes")
      .eq("catalog", "mj-vault")
      .order("rarity_rank")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data as VaultRow[]) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// Owned Jordan Vault cards (catalog='mj-vault') among the given card ids — for the
// Vault section of /collection (they have no tier, so they're not in the tier grid).
export async function getOwnedVaultCards(cardIds: string[]): Promise<VaultRow[]> {
  if (cardIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("cards")
    .select("id, slug, name, card_number, year, image_url, attributes")
    .eq("catalog", "mj-vault")
    .in("id", cardIds)
    .order("name");
  return (data as VaultRow[]) ?? [];
}

export async function getCardBySlug(slug: string): Promise<CardWithSet | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("cards").select("*, sets(*)").eq("slug", slug).maybeSingle();
  return (data as CardWithSet) ?? null;
}

export async function getCardPrices(cardId: string): Promise<CardPrice[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("card_prices").select("*").eq("card_id", cardId);
  return (data as CardPrice[]) ?? [];
}

// ---- Per-user (RLS-scoped to the signed-in user) ----

export async function getMyHoldings(): Promise<Holding[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("holdings").select("*").order("created_at");
  return (data as Holding[]) ?? [];
}

export async function getMyHoldingsForCard(cardId: string): Promise<Holding[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holdings")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at");
  return (data as Holding[]) ?? [];
}

import { computeTierSummary, type CardIndexRow } from "@/lib/summary";
export { computeTierSummary, type CardIndexRow };

// Lightweight card index (378 rows) for mapping holdings -> tier and base value.
export async function getCardIndex(): Promise<CardIndexRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("cards").select("id, tier_id, catalog_value_cents").eq("catalog", "mj-hierarchy");
  return (data as CardIndexRow[]) ?? [];
}

// Best price per (card_id, grade_key) for the given cards, keyed "cardId|gradeKey".
export async function getPriceMap(cardIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (cardIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("card_prices")
    .select("card_id, grade_key, median_cents")
    .in("card_id", cardIds);
  for (const row of (data as { card_id: string; grade_key: string; median_cents: number | null }[]) ?? []) {
    if (row.median_cents != null) map.set(`${row.card_id}|${row.grade_key}`, row.median_cents);
  }
  return map;
}

// ---- Analytics ----

import type { OwnedCardMeta, PriceHistoryRow as AnalyticsHistoryRow } from "@/lib/analytics";

export async function getOwnedCardMeta(cardIds: string[]): Promise<Map<string, OwnedCardMeta>> {
  const map = new Map<string, OwnedCardMeta>();
  if (cardIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("cards")
    .select("id, name, slug, tier_id, print_run, serial_numbered, catalog_value_cents, sets(name)")
    .in("id", cardIds);
  type Row = OwnedCardMeta & { sets: { name: string }[] | { name: string } | null };
  for (const r of (data as unknown as Row[]) ?? []) {
    const set = Array.isArray(r.sets) ? r.sets[0]?.name : r.sets?.name;
    map.set(r.id, {
      id: r.id, name: r.name, slug: r.slug, tier_id: r.tier_id,
      print_run: r.print_run, serial_numbered: r.serial_numbered,
      catalog_value_cents: r.catalog_value_cents, set_name: set ?? null,
    });
  }
  return map;
}

export async function getPriceHistoryForCards(cardIds: string[]): Promise<AnalyticsHistoryRow[]> {
  if (cardIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_history")
    .select("card_id, grade_key, value_cents, recorded_on")
    .in("card_id", cardIds);
  return (data as AnalyticsHistoryRow[]) ?? [];
}

// Wanted cards whose current raw price is at/below the user's max target.
export async function getWatchlistDeals(): Promise<
  { name: string; slug: string; target: number; current: number }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("want_list")
    .select("card_id, max_price_cents, cards(name, slug)")
    .not("max_price_cents", "is", null);
  type Row = { card_id: string; max_price_cents: number; cards: { name: string; slug: string }[] | { name: string; slug: string } | null };
  const rows = (data as unknown as Row[]) ?? [];
  const priceMap = await getPriceMap(rows.map((r) => r.card_id));
  const out: { name: string; slug: string; target: number; current: number }[] = [];
  for (const r of rows) {
    const card = Array.isArray(r.cards) ? r.cards[0] : r.cards;
    const current = priceMap.get(`${r.card_id}|raw`);
    if (card && current != null && current <= r.max_price_cents) {
      out.push({ name: card.name, slug: card.slug, target: r.max_price_cents, current });
    }
  }
  return out.sort((a, b) => a.current - b.current);
}

// ---- Want list & profile ----

export type WantListItem = CardWithSet & {
  want_id: string;
  priority: number;
  target_cents: number | null;
  current_cents: number | null;
};
export async function getMyWantList(): Promise<WantListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("want_list")
    .select("id, priority, max_price_cents, cards(*, sets(*))")
    .order("priority");
  type Row = { id: string; priority: number; max_price_cents: number | null; cards: CardWithSet };
  const rows = (data as unknown as Row[]) ?? [];
  // Current value: raw eBay median where we have it, else the seeded catalog value.
  const priceMap = await getPriceMap(rows.map((r) => r.cards.id));
  return rows.map((r) => ({
    ...r.cards,
    want_id: r.id,
    priority: r.priority,
    target_cents: r.max_price_cents,
    current_cents: priceMap.get(`${r.cards.id}|raw`) ?? r.cards.catalog_value_cents ?? null,
  }));
}

export async function getMyWantCardIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("want_list").select("card_id");
  return new Set(((data as { card_id: string }[]) ?? []).map((r) => r.card_id));
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function getPublicCollection(username: string): Promise<PublicCollection | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_collection", { p_username: username });
  return (data as PublicCollection) ?? null;
}
