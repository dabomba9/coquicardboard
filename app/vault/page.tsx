import type { Metadata } from "next";
import { getVaultCatalog, getMyHoldings } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { VaultExplorer, type VaultTile } from "@/components/vault-explorer";
import { legendArtForCatalog } from "@/lib/legends";
import {
  parseVaultParams,
  vaultFilterOptions,
  vaultFacets,
  filterSortVault,
} from "@/lib/vault-filter";

export const metadata: Metadata = {
  title: "Jordan Vault — every Michael Jordan card",
  description: "Browse 12,000+ Michael Jordan cards — search, filter, follow market value, and track what you own.",
  alternates: { canonical: "/vault" },
  openGraph: {
    title: "Jordan Vault — every Michael Jordan card · Coqui Cardboard",
    description: "Browse 12,000+ Michael Jordan cards — search, filter, follow market value, and track what you own.",
    url: "/vault",
    type: "website",
  },
};

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = parseVaultParams(sp);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [catalog, holdings] = await Promise.all([
    getVaultCatalog(),
    user ? getMyHoldings() : Promise.resolve([]),
  ]);

  const ownedIds = new Set(holdings.map((h) => h.card_id));
  const tradeIds = new Set(holdings.filter((h) => h.for_trade).map((h) => h.card_id));

  const options = vaultFilterOptions(catalog);
  const facets = vaultFacets(catalog, ownedIds);
  const { items, total, pages, page } = filterSortVault(catalog, params, ownedIds);

  const tiles: VaultTile[] = items.map((it) => ({
    ...it,
    owned: ownedIds.has(it.id),
    forTrade: tradeIds.has(it.id),
  }));

  const withImage = catalog.reduce((n, c) => n + (c.image_url ? 1 : 0), 0);
  const ownedCount = facets[0]?.owned ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">Jordan Vault</h1>
      <p className="mt-1 text-sm text-muted">
        <span className="font-data text-base text-foreground">{catalog.length.toLocaleString()}</span> Michael Jordan
        cards · <span className="font-data text-base text-foreground">{withImage.toLocaleString()}</span> with images.
        {user ? " Track what you own and hunt down the rest." : " Sign in to track what you own."}
      </p>
      <VaultExplorer
        tiles={tiles}
        params={params}
        options={options}
        facets={facets}
        total={total}
        pages={pages}
        page={page}
        signedIn={!!user}
        ownedCount={ownedCount}
        placeholderArt={legendArtForCatalog("mj-vault")}
      />
    </div>
  );
}
