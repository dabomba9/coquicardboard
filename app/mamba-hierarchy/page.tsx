import type { Metadata } from "next";
import { getHierarchyCatalog, getMyHoldings, getCatalogValueMapCached } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { HierarchyExplorer, type ExplorerCard } from "@/components/hierarchy-explorer";
import { Coqui } from "@/components/mascot/coqui";
import { MAMBA_TIERS } from "@/data/mamba-hierarchy";

export const metadata: Metadata = {
  title: "The Mamba Hierarchy — Kobe Bryant's definitive cards",
  description:
    "Kobe Bryant's most significant cards ranked across three tiers — from the grails to the foundation. Track what you own and follow live market value.",
  alternates: { canonical: "/mamba-hierarchy" },
  openGraph: {
    title: "The Mamba Hierarchy · Coqui Cardboard",
    description:
      "Kobe Bryant's most significant cards ranked across three tiers — the grails, elite chase, and the foundation.",
    url: "/mamba-hierarchy",
    type: "website",
  },
};

export default async function MambaHierarchyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [cards, holdings, valueEntries] = await Promise.all([
    getHierarchyCatalog("mamba-hierarchy"),
    user ? getMyHoldings() : Promise.resolve([]),
    getCatalogValueMapCached("mamba-hierarchy"),
  ]);
  const valueMap = new Map(valueEntries);

  const ownedIds = new Set(holdings.map((h) => h.card_id));
  const tradeIds = new Set(holdings.filter((h) => h.for_trade).map((h) => h.card_id));

  // The Mamba Hierarchy owns its tiers on the page (not the global tiers table).
  const tiers = MAMBA_TIERS.map((t) => ({
    id: t.id,
    name: t.name,
    card_count: cards.filter((c) => c.tier_id === t.id).length,
  }));

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
      <div className="flex items-center gap-3">
        <Coqui pose="idle" size={44} aria-label="" />
        <div>
          <h1 className="font-display text-lg uppercase tracking-tight">The Mamba Hierarchy</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="font-data text-base text-foreground">{cards.length}</span> definitive Kobe Bryant cards across{" "}
            <span className="font-data text-base text-foreground">{tiers.length}</span> tiers.
            {user ? " Search, filter, and sort your collection." : " Sign in to track what you own."}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <HierarchyExplorer
          cards={explorerCards}
          tiers={tiers}
          signedIn={!!user}
          storageKey="mamba.hierarchy.view"
        />
      </div>
    </div>
  );
}
