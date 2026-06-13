import type { Metadata } from "next";
import { getVaultCards, getMyHoldings } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { VaultExplorer, type VaultTile } from "@/components/vault-explorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jordan Vault — every Michael Jordan card",
  description: "Browse 12,000+ Michael Jordan cards — search, filter, and track what you own.",
};

export default async function VaultPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [cards, holdings] = await Promise.all([
    getVaultCards(),
    user ? getMyHoldings() : Promise.resolve([]),
  ]);

  const ownedIds = new Set(holdings.map((h) => h.card_id));
  const tradeIds = new Set(holdings.filter((h) => h.for_trade).map((h) => h.card_id));

  const tiles: VaultTile[] = cards.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    year: c.year,
    cardNumber: c.card_number,
    manufacturer: (c.attributes?.manufacturer as string) ?? null,
    cardType: (c.attributes?.cardType as string) ?? null,
    frontImage: c.image_url,
    owned: ownedIds.has(c.id),
    forTrade: tradeIds.has(c.id),
  }));

  const withImage = tiles.filter((t) => t.frontImage).length;
  const owned = tiles.filter((t) => t.owned).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">Jordan Vault</h1>
      <p className="mt-1 text-sm text-muted">
        <span className="font-data text-base text-foreground">{tiles.length.toLocaleString()}</span> Michael Jordan
        cards · <span className="font-data text-base text-foreground">{withImage.toLocaleString()}</span> with images.
        {user ? " Track what you own and hunt down the rest." : " Sign in to track what you own."}
      </p>
      <VaultExplorer cards={tiles} signedIn={!!user} ownedCount={owned} />
    </div>
  );
}
