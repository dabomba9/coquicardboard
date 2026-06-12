import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVaultCard, relatedVaultCards, type VaultCard } from "@/lib/vault";
import { CardThumb } from "@/components/card-thumb";
import { CardLightbox } from "@/components/card-lightbox";
import { Badge, Panel } from "@/components/ui/primitives";
import { cn, TIER_COLORS } from "@/lib/utils";

function thumbOf(card: VaultCard, image: string | null) {
  return {
    name: card.name ?? "",
    card_number: card.cardNumber,
    year: card.year,
    tier_id: card.tier ?? 4,
    image_url: image,
    sets: card.manufacturer ? { name: card.manufacturer } : null,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const card = getVaultCard(Number(id));
  return { title: card?.name ? `${card.name} — Jordan Vault` : "Jordan Vault" };
}

export default async function VaultCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getVaultCard(Number(id));
  if (!card) notFound();

  const c = TIER_COLORS[card.tier ?? 4] ?? TIER_COLORS[4];
  const tierStyle = { ["--border" as string]: `var(--tier-${card.tier ?? 4})` } as React.CSSProperties;
  const related = relatedVaultCards(card);

  const facts: [string, string | null][] = [
    ["Manufacturer", card.manufacturer],
    ["Year", card.year ? String(card.year) : null],
    ["Card #", card.cardNumber],
    ["Type", card.cardType],
    ["Brand", card.brand && card.brand !== card.manufacturer ? card.brand : null],
    ["Hierarchy", card.tier != null ? `Tier ${card.tier} · Page ${card.page} · Row ${card.row}` : null],
  ];

  const query = encodeURIComponent(`${card.name ?? ""} Michael Jordan`);
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${query}`;
  const googleUrl = `https://www.google.com/search?tbm=isch&q=${query}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/vault" className="font-sans text-[10px] uppercase tracking-wide text-muted hover:text-foreground">← Jordan Vault</Link>

      <div className="mt-4 grid gap-8 sm:grid-cols-[280px_1fr]">
        {/* Front + back */}
        <div className="space-y-3">
          <div className="relative overflow-hidden pixel-box bg-card p-1" style={tierStyle}>
            <CardLightbox imageUrl={card.frontImage} alt={`${card.name} (front)`}>
              <CardThumb card={thumbOf(card, card.frontImage)} className="w-full !border-0 !shadow-none" />
            </CardLightbox>
          </div>
          {card.backImage && (
            <div className="relative overflow-hidden pixel-box bg-card p-1" style={tierStyle}>
              <CardLightbox imageUrl={card.backImage} alt={`${card.name} (back)`}>
                <CardThumb card={thumbOf(card, card.backImage)} className="w-full !border-0 !shadow-none" />
              </CardLightbox>
              <div className="px-1 pb-0.5 pt-1 font-sans text-[9px] uppercase tracking-wide text-muted">Back</div>
            </div>
          )}
        </div>

        {/* Stats */}
        <Panel className="self-start p-5" style={tierStyle}>
          <div className="flex flex-wrap items-center gap-2">
            {card.cardType && <Badge className={c.text}>{card.cardType}</Badge>}
            {card.tier != null && (
              <span className={cn("pixel-box px-2 py-0.5 font-sans text-[10px] uppercase", c.bg, c.text)} style={tierStyle}>
                Hierarchy · Tier {card.tier}
              </span>
            )}
          </div>
          <h1 className="mt-4 font-display text-lg leading-relaxed tracking-tight">{card.name}</h1>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="font-sans text-[9px] uppercase tracking-wide text-muted">{k}</dt>
                <dd className="font-data text-lg leading-tight">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-xs text-muted">
            Find this card:{" "}
            <a href={ebayUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">eBay</a>
            {" · "}
            <a href={googleUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">Google Images</a>
            {card.psaPopReport && (
              <>
                {" · "}
                <a href={card.psaPopReport} target="_blank" rel="noreferrer" className="text-accent hover:underline">PSA pop</a>
              </>
            )}
          </p>
        </Panel>
      </div>

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="font-sans text-xs uppercase tracking-wide">More {card.manufacturer} cards</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {related.map((r) => (
              <Link key={r.id} href={`/vault/${r.id}`} className="group">
                <CardThumb card={thumbOf(r, r.frontImage)} className="transition-transform group-hover:-translate-y-1" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
