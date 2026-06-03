import { getTiers, getAllCards, getMyHoldings, getCatalogValueMap } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { HierarchyExplorer, type ExplorerCard } from "@/components/hierarchy-explorer";

export const dynamic = "force-dynamic";

export default async function HierarchyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [tiers, cards, holdings, valueMap] = await Promise.all([
    getTiers(),
    getAllCards(),
    user ? getMyHoldings() : Promise.resolve([]),
    getCatalogValueMap(),
  ]);

  const ownedIds = new Set(holdings.map((h) => h.card_id));
  const tradeIds = new Set(holdings.filter((h) => h.for_trade).map((h) => h.card_id));

  const explorerCards: ExplorerCard[] = cards.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    tier_id: c.tier_id,
    card_number: c.card_number,
    year: c.year,
    set_name: c.sets?.name ?? null,
    set_slug: c.sets?.slug ?? null,
    image_url: c.image_url,
    rarity_rank: c.rarity_rank,
    is_rookie: c.is_rookie,
    is_insert: c.is_insert,
    is_parallel: c.is_parallel,
    serial_numbered: c.serial_numbered,
    value_cents: valueMap.get(c.id) ?? 0,
    owned: ownedIds.has(c.id),
    for_trade: tradeIds.has(c.id),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">The Hierarchy</h1>
      <p className="mt-1 text-sm text-muted">
        {cards.length} cards across {tiers.length} tiers.
        {user ? " Search, filter, and sort your collection." : " Sign in to track what you own."}
      </p>

      <div className="mt-6">
        <HierarchyExplorer
          cards={explorerCards}
          tiers={tiers.map((t) => ({ id: t.id, name: t.name, card_count: t.card_count }))}
          signedIn={!!user}
        />
      </div>
    </div>
  );
}
