import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardBySlugCached, getCardPricesCached, getMyWantCardIds, getPriceHistoryCached, getCardOwnerCount, getRelatedCardsCached, getRelatedVaultCardsCached, getMyHoldingsForCard } from "@/lib/queries";
import { priceStats } from "@/lib/card-stats";
import { ebaySearchUrl, ebaySoldUrl, sportsCardsProUrl, outboundRel } from "@/lib/affiliate";
import { isRealPriceSource } from "@/lib/prices";
import { JsonLd } from "@/components/json-ld";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/structured-data";
import { MAMBA_TIERS } from "@/data/mamba-hierarchy";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCardBySlugCached(slug);
  if (!card) return {};
  const a = (card.attributes ?? {}) as Record<string, unknown>;
  const manu = (typeof a.manufacturer === "string" ? a.manufacturer : null) ?? card.sets?.manufacturer ?? null;
  const bits = [card.year ? String(card.year) : null, card.sets?.name ?? manu, card.card_number ? `#${card.card_number}` : null].filter(Boolean);
  const description = `${card.name}${bits.length ? ` — ${bits.join(" · ")}` : ""}. Track market value, grade your copies, and add it to your collection or want list on Coqui Cardboard.`;
  const images = card.image_url ? [card.image_url] : undefined;
  return {
    title: card.name,
    description,
    alternates: { canonical: `/cards/${slug}` },
    openGraph: { title: `${card.name} · Coqui Cardboard`, description, url: `/cards/${slug}`, images, type: "website" },
    twitter: { card: images ? "summary_large_image" : "summary", title: card.name, description, images },
  };
}
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { CardThumb } from "@/components/card-thumb";
import { CardLightbox } from "@/components/card-lightbox";
import { WantButton } from "@/components/want-button";
import { AddToCollectionButton } from "@/components/add-to-collection-button";
import { ShareButton } from "@/components/share-button";
import { PriceChart } from "@/components/price-chart";
import { RefreshPriceButton } from "@/components/refresh-price-button";
import { Badge, Button, Panel } from "@/components/ui/primitives";
import { cn, formatUsd, gradeLabel, TIER_COLORS } from "@/lib/utils";
import type { CardPrice } from "@/lib/types";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getCardBySlugCached(slug);
  if (!card) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isVault = card.catalog === "mj-vault" || card.catalog === "kobe-vault" || card.catalog === "clemente-vault" || card.catalog === "killebrew-vault";
  const isKobeVault = card.catalog === "kobe-vault";
  const isClementeVault = card.catalog === "clemente-vault";
  const isKillebrewVault = card.catalog === "killebrew-vault";
  const isKobe = card.catalog === "kobe-hierarchy";
  const isMamba = card.catalog === "mamba-hierarchy";
  const attrs = (card.attributes ?? {}) as Record<string, unknown>;
  const attr = (k: string) => (typeof attrs[k] === "string" ? (attrs[k] as string) : null);
  const manufacturer = attr("manufacturer");

  const [allPrices, history, wantIds, ownerCount, related, myHoldings] = await Promise.all([
    getCardPricesCached(card.id),
    getPriceHistoryCached(card.id),
    user ? getMyWantCardIds() : Promise.resolve(new Set<string>()),
    getCardOwnerCount(card.id),
    isVault
      ? (manufacturer ? getRelatedVaultCardsCached(manufacturer, card.year, card.id, card.catalog) : Promise.resolve([]))
      : (card.set_id ? getRelatedCardsCached(card.set_id, card.id) : Promise.resolve([])),
    user ? getMyHoldingsForCard(card.id) : Promise.resolve([]),
  ]);
  // Only show REAL marketplace prices (eBay). Drops sentinel 'none' rows and any
  // fabricated/estimated rows, so values are always trustworthy.
  const prices = allPrices.filter((p) => p.median_cents != null && isRealPriceSource(p.source));

  const backImage = attr("backImage");
  const psaPopReport = attr("psaPopReport");
  const c = TIER_COLORS[card.tier_id] ?? TIER_COLORS[4];
  const cardType = attr("type") ?? attr("cardType");
  const facts: [string, string | null][] = [
    ["Set", card.sets?.name ?? null],
    ["Year", card.year ? String(card.year) : null],
    ["Card #", card.card_number ? `#${card.card_number}` : null],
    ["Type", cardType],
    ["Manufacturer", card.sets?.manufacturer ?? attr("manufacturer")],
    ["Print run", card.print_run ? `/${card.print_run}` : card.serial_numbered ? "Serial #'d" : null],
    ["Pack odds", card.pack_odds],
  ];

  // The user's own copies of this card.
  const owned = myHoldings.length > 0;
  const copies = myHoldings.reduce((s, h) => s + Math.max(h.quantity, 1), 0);
  const gradeSummary = (() => {
    const counts = new Map<string, number>();
    for (const h of myHoldings) {
      const g = gradeLabel(h.condition_type, h.grading_company, h.grade);
      counts.set(g, (counts.get(g) ?? 0) + Math.max(h.quantity, 1));
    }
    return [...counts.entries()].map(([g, n]) => `${n} ${g}`).join(" · ");
  })();

  // Value: lead with a headline price (raw preferred), other grades as chips.
  const sortedPrices = prices.slice().sort((a, b) => (a.grade_key === "raw" ? -1 : b.grade_key === "raw" ? 1 : 0));
  const headline = sortedPrices[0] ?? null;
  const otherPrices = sortedPrices.slice(1);
  const stats = headline ? priceStats(history, headline.grade_key) : null;
  const priceLabel = (p: CardPrice) => {
    const asOf = p.as_of ? new Date(p.as_of).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
    if (p.source === "ebay (sold)") return `eBay sold${asOf ? ` · ${asOf}` : ""}`;
    if (p.source?.startsWith("ebay")) return `eBay asking${asOf ? ` · ${asOf}` : ""}`;
    return "estimated";
  };

  const player = isKobeVault || isMamba || isKobe ? "Kobe Bryant" : isClementeVault ? "Roberto Clemente" : isKillebrewVault ? "Harmon Killebrew" : "Michael Jordan";
  const q = encodeURIComponent(`${card.name} ${player}`);
  const ebayUrl = ebaySearchUrl(`${card.name} ${player}`, card.slug);
  const ebaySold = ebaySoldUrl(`${card.name} ${player}`, card.slug);
  const scpUrl = sportsCardsProUrl(`${card.name} ${player}`);
  const googleUrl = `https://www.google.com/search?tbm=isch&q=${q}`;

  // Holographic foil scales with rarity. Vault cards have no tier → no foil.
  const foilClass = isVault ? "" :
    card.tier_id === 1 ? "foil foil--strong" : card.tier_id === 2 ? "foil" : card.tier_id === 3 ? "foil foil--soft" : "";
  const tierStyle = (isVault ? {} : { ["--border" as string]: `var(--tier-${card.tier_id})` }) as React.CSSProperties;
  const tierName = isMamba
    ? (MAMBA_TIERS.find((t) => t.id === card.tier_id)?.name ?? "")
    : card.tier_id ? (["Legendary", "Epic", "Rare", "Common"][card.tier_id - 1] ?? "Common") : "";

  // schema.org structured data (Product + breadcrumbs) for search rich results.
  const ldBits = [card.year ? String(card.year) : null, card.sets?.name ?? manufacturer, card.card_number ? `#${card.card_number}` : null].filter(Boolean);
  const ldDescription = `${card.name}${ldBits.length ? ` — ${ldBits.join(" · ")}` : ""}. ${player} trading card — track market value, grade your copies, and build your collection on Coqui Cardboard.`;
  // `prices` is already real-marketplace-only, so these feed an honest AggregateOffer.
  const pricesUsd = prices.map((p) => (p.median_cents ?? 0) / 100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={productJsonLd({ name: card.name, slug: card.slug, description: ldDescription, image: card.image_url, brand: manufacturer ?? card.sets?.name ?? null, pricesUsd, offerUrl: ebayUrl })} />
      <JsonLd data={breadcrumbJsonLd({ name: card.name, slug: card.slug, catalog: card.catalog })} />
      <Link href={isKobeVault ? "/kobe-vault" : isClementeVault ? "/clemente-vault" : isKillebrewVault ? "/killebrew-vault" : isVault ? "/vault" : isMamba ? "/mamba-hierarchy" : isKobe ? "/kobe-hierarchy" : "/mj-hierarchy"} className="text-[11px] uppercase tracking-wide text-muted hover:text-foreground">← {isKobeVault ? "Kobe Vault" : isClementeVault ? "Clemente Vault" : isKillebrewVault ? "Killebrew Vault" : isVault ? "Jordan Vault" : isMamba ? "Mamba Hierarchy" : isKobe ? "Mamba Origins" : "Hierarchy"}</Link>

      <div className="mt-4 grid gap-8 sm:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div className={cn("relative overflow-hidden rounded-md border border-border/50 bg-card p-1", foilClass)} style={tierStyle}>
            <CardLightbox imageUrl={card.image_url} alt={card.name}>
              <CardThumb card={card} className="w-full !border-0 !shadow-none" />
            </CardLightbox>
          </div>
          {backImage && (
            <div>
              <div className="relative overflow-hidden rounded-md border border-border/50 bg-card p-1">
                <CardLightbox imageUrl={backImage} alt={`${card.name} (back)`}>
                  <CardThumb card={{ ...card, image_url: backImage }} className="w-full !border-0 !shadow-none" />
                </CardLightbox>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">Back</p>
            </div>
          )}
          {card.image_source && (
            <p className="text-[10px] text-muted">Image: {card.image_source}</p>
          )}
        </div>

        {/* Identity + actions */}
        <Panel className="self-start p-5" style={tierStyle}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", isVault || isKobe ? "bg-accent/12 text-accent" : cn(c.bg, c.text))}
              style={tierStyle}
            >
              {isKobeVault ? "Kobe Vault" : isClementeVault ? "Clemente Vault" : isKillebrewVault ? "Killebrew Vault" : isVault ? "Jordan Vault" : isKobe ? "Mamba Origins" : `Tier ${card.tier_id} · ${tierName}`}
            </span>
            {card.is_rookie && <Badge className={c.text}>Rookie</Badge>}
            {card.is_insert && <Badge className={c.text}>Insert</Badge>}
            {card.is_parallel && <Badge className={c.text}>Parallel</Badge>}
          </div>
          <h1 className="mt-4 font-display text-lg leading-relaxed tracking-tight">{card.name}</h1>

          {/* Your ownership */}
          {owned && (
            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2.5 text-sm">
              <span className="font-semibold text-accent">✓ In your collection</span>
              <span className="text-muted"> · {copies} cop{copies === 1 ? "y" : "ies"}{gradeSummary ? ` · ${gradeSummary}` : ""}</span>
            </div>
          )}
          {ownerCount > 0 && (
            <p className="mt-2 text-xs text-muted">Owned by {ownerCount} collector{ownerCount === 1 ? "" : "s"} in the community.</p>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap gap-3">
            {user ? (
              owned ? (
                <>
                  <Link href={`/collection/${card.slug}`}><Button>Manage</Button></Link>
                  <AddToCollectionButton cardId={card.id} label="Add another" variant="secondary" />
                  <WantButton cardId={card.id} wanted={wantIds.has(card.id)} />
                  <ShareButton title={card.name} />
                </>
              ) : (
                <>
                  <AddToCollectionButton cardId={card.id} />
                  <WantButton cardId={card.id} wanted={wantIds.has(card.id)} />
                  <ShareButton title={card.name} />
                </>
              )
            ) : (
              <>
                <Link href="/login"><Button>Sign in to add</Button></Link>
                <ShareButton title={card.name} />
              </>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] uppercase tracking-wide text-muted">{k}</dt>
                <dd className="font-data text-lg leading-tight">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-xs text-muted">
            Recent sales:{" "}
            <a href={ebaySold} target="_blank" rel={outboundRel} className="text-accent hover:underline">eBay sold</a>
            {" · "}
            <a href="https://130point.com/sales/" target="_blank" rel="noreferrer" className="text-accent hover:underline">130point</a>
            {" · "}
            <a href={scpUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">SportsCardsPro</a>{" "}
            <span className="text-muted">(eBay, Fanatics, Goldin &amp; more)</span>
          </p>
          <p className="mt-1.5 text-xs text-muted">
            Find this card:{" "}
            <a href={ebayUrl} target="_blank" rel={outboundRel} className="text-accent hover:underline">eBay</a>
            {" · "}
            <a href={googleUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">Google Images</a>
            {psaPopReport && (
              <>
                {" · "}
                <a href={psaPopReport} target="_blank" rel="noreferrer" className="text-accent hover:underline">PSA Pop Report ↗</a>
              </>
            )}
          </p>
        </Panel>
      </div>

      {/* Market value */}
      <Panel className="mt-8 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide">Market value</h2>
          {isAdmin(user?.email) && <RefreshPriceButton cardId={card.id} />}
        </div>

        {headline ? (
          <>
            <div className="mt-3 flex items-end gap-3">
              <div className="font-num text-4xl leading-none text-foreground">{formatUsd(headline.median_cents)}</div>
              <div className="pb-1">
                <div className="text-[11px] uppercase tracking-wide text-muted">{headline.grade_key}</div>
                <div className={cn("text-[11px]", headline.source?.startsWith("ebay") ? "text-accent" : "text-muted")}>{priceLabel(headline)}</div>
                {headline.sample_size ? (
                  <div className="text-[11px] text-muted">{headline.sample_size} sale{headline.sample_size === 1 ? "" : "s"}</div>
                ) : null}
              </div>
            </div>
            {otherPrices.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {otherPrices.map((p) => (
                  <div key={p.grade_key} className="rounded-full border border-border/50 bg-elevated px-3 py-1.5 text-sm" title={p.sample_size ? `${p.sample_size} sale${p.sample_size === 1 ? "" : "s"}` : undefined}>
                    <span className="text-muted">{p.grade_key}</span>{" "}
                    <span className="font-num text-foreground">{formatUsd(p.median_cents)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Price-history stat strip: all-time high/low + change since first record */}
            {stats && (
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/40 pt-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted">All-time high</div>
                  <div className="font-num text-foreground">{formatUsd(stats.high)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted">All-time low</div>
                  <div className="font-num text-foreground">{formatUsd(stats.low)}</div>
                </div>
                {stats.changePct != null && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">Change</div>
                    <div className={cn("font-num", stats.changePct >= 0 ? "text-accent" : "text-red-500")}>
                      {stats.changePct >= 0 ? "+" : ""}{stats.changePct}%
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted">
              {prices.some((p) => p.source === "ebay (sold)")
                ? "Real eBay sold prices where available · not investment advice"
                : prices.some((p) => p.source?.startsWith("ebay"))
                  ? "eBay asking prices where available · not investment advice"
                  : "Not investment advice"}
            </p>
            {history.length > 0 && <div className="mt-4"><PriceChart series={history} /></div>}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">No recent sales yet — value will appear here as sales come in.</p>
        )}
      </Panel>

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide">More from {isVault ? (manufacturer ?? "the Vault") : (card.sets?.name ?? "this set")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {related.map((r) => (
              <Link key={r.id} href={`/cards/${r.slug}`} className="group">
                <CardThumb card={r} className="transition-transform group-hover:-translate-y-1" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
