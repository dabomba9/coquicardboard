import type { Metadata } from "next";
import { vaultTiles } from "@/lib/vault";
import { VaultExplorer } from "@/components/vault-explorer";

export const metadata: Metadata = {
  title: "Jordan Vault — every Michael Jordan card",
  description: "Browse 12,000+ Michael Jordan cards — search and filter by manufacturer, set, year, and type.",
};

export default function VaultPage() {
  const tiles = vaultTiles();
  const withImage = tiles.filter((t) => t.frontImage).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">Jordan Vault</h1>
      <p className="mt-1 text-sm text-muted">
        <span className="font-data text-base text-foreground">{tiles.length.toLocaleString()}</span> Michael Jordan
        cards · <span className="font-data text-base text-foreground">{withImage.toLocaleString()}</span> with
        images. Search, filter, and explore the complete catalog.
      </p>
      <VaultExplorer cards={tiles} />
    </div>
  );
}
