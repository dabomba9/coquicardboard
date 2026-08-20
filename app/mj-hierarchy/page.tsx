import type { Metadata } from "next";
import { getTiersCached, getHierarchyCatalog, getMyHoldings, getCatalogValueMapCached } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { HierarchyExplorer, type ExplorerCard } from "@/components/hierarchy-explorer";
import { legendArtForCatalog } from "@/lib/legends";
import { JsonLd } from "@/components/json-ld";
import { collectionJsonLd } from "@/lib/structured-data";
import { Coqui } from "@/components/mascot/coqui";

export const metadata: Metadata = {
  title: "The Michael Jordan Card Hierarchy",
  description:
    "All 378 essential Michael Jordan cards ranked across four tiers — track what you own, follow live market value, and build a focused collection.",
  alternates: { canonical: "/mj-hierarchy" },
  openGraph: {
    title: "The Michael Jordan Card Hierarchy · Coqui Cardboard",
    description:
      "All 378 essential Michael Jordan cards ranked across four tiers — track what you own, follow live market value, and build a focused collection.",
    url: "/mj-hierarchy",
    type: "website",
  },
};

export default async function HierarchyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [tiers, cards, holdings, valueEntries] = await Promise.all([
    getTiersCached(),
    getHierarchyCatalog(),
    user ? getMyHoldings() : Promise.resolve([]),
    getCatalogValueMapCached(),
  ]);
  const valueMap = new Map(valueEntries);

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
      <JsonLd data={collectionJsonLd({ name: "The Michael Jordan Card Hierarchy", description: metadata.description as string, path: "/mj-hierarchy", items: explorerCards.map((c) => ({ name: c.name, slug: c.slug })) })} />
      <div className="flex items-center gap-3">
        <Coqui pose="idle" size={44} aria-label="" />
        <div>
          <h1 className="font-display text-lg uppercase tracking-tight">The Hierarchy</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="font-data text-base text-foreground">{cards.length}</span> cards across{" "}
            <span className="font-data text-base text-foreground">{tiers.length}</span> tiers.
            {user ? " Search, filter, and sort your collection." : " Sign in to track what you own."}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <HierarchyExplorer
          cards={explorerCards}
          tiers={tiers.map((t) => ({ id: t.id, name: t.name, card_count: t.card_count }))}
          signedIn={!!user}
          placeholderArt={legendArtForCatalog("mj-hierarchy")}
        />
      </div>
    </div>
  );
}
