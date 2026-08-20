import type { Metadata } from "next";
import { getHierarchyCatalog, getMyHoldings, getCatalogValueMapCached } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { HierarchyExplorer, type ExplorerCard } from "@/components/hierarchy-explorer";
import { legendArtForCatalog } from "@/lib/legends";
import { JsonLd } from "@/components/json-ld";
import { collectionJsonLd } from "@/lib/structured-data";
import { Coqui } from "@/components/mascot/coqui";

export const metadata: Metadata = {
  title: "The Kobe Bryant Mamba Origins Hierarchy",
  description:
    "All 143 Kobe Bryant 1996-97 rookie cards across 25 brands — track what you own, follow live market value, and chase the Mamba's rookie class.",
  alternates: { canonical: "/kobe-hierarchy" },
  openGraph: {
    title: "The Kobe Bryant Mamba Origins Hierarchy · Coqui Cardboard",
    description:
      "All 143 Kobe Bryant 1996-97 rookie cards across 25 brands — track what you own and follow live market value.",
    url: "/kobe-hierarchy",
    type: "website",
  },
};

export default async function KobeHierarchyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [cards, holdings, valueEntries] = await Promise.all([
    getHierarchyCatalog("kobe-hierarchy"),
    user ? getMyHoldings() : Promise.resolve([]),
    getCatalogValueMapCached("kobe-hierarchy"),
  ]);
  const valueMap = new Map(valueEntries);

  const ownedIds = new Set(holdings.map((h) => h.card_id));
  const tradeIds = new Set(holdings.filter((h) => h.for_trade).map((h) => h.card_id));
  const brandCount = new Set(cards.map((c) => c.sets?.name).filter(Boolean)).size;

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
      <JsonLd data={collectionJsonLd({ name: "Mamba Origins", description: metadata.description as string, path: "/kobe-hierarchy", items: explorerCards.map((c) => ({ name: c.name, slug: c.slug })) })} />
      <div className="flex items-center gap-3">
        <Coqui pose="idle" size={44} aria-label="" />
        <div>
          <h1 className="font-display text-lg uppercase tracking-tight">Mamba Origins</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="font-data text-base text-foreground">{cards.length}</span> Kobe Bryant 1996-97 rookie cards across{" "}
            <span className="font-data text-base text-foreground">{brandCount}</span> brands.
            {user ? " Search, filter, and sort your collection." : " Sign in to track what you own."}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <HierarchyExplorer
          cards={explorerCards}
          tiers={[]}
          signedIn={!!user}
          defaultGroupBy="set"
          storageKey="kobe.hierarchy.view"
          // Cards whose image couldn't be verified show the hero Kobe rather than a
          // wrong card — see the image audit in admin/verify-images.ts.
          placeholderArt={legendArtForCatalog("kobe-hierarchy")}
        />
      </div>
    </div>
  );
}
