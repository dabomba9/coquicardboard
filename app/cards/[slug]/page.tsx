import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardBySlug, getCardPrices, getMyWantCardIds, getPriceHistory, getCardOwnerCount, getRelatedCards } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { CardThumb } from "@/components/card-thumb";
import { CardLightbox } from "@/components/card-lightbox";
import { WantButton } from "@/components/want-button";
import { PriceChart } from "@/components/price-chart";
import { RefreshPriceButton } from "@/components/refresh-price-button";
import { Badge, Button, Panel } from "@/components/ui/primitives";
import { cn, formatUsd, TIER_COLORS } from "@/lib/utils";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [prices, history, wantIds, ownerCount, related] = await Promise.all([
    getCardPrices(card.id),
    getPriceHistory(card.id),
    user ? getMyWantCardIds() : Promise.resolve(new Set<string>()),
    getCardOwnerCount(card.id),
    card.set_id ? getRelatedCards(card.set_id, card.id) : Promise.resolve([]),
  ]);

  const isVault = card.catalog === "mj-vault";
  const attrs = (card.attributes ?? {}) as Record<string, unknown>;
  const attr = (k: string) => (typeof attrs[k] === "string" ? (attrs[k] as string) : null);
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

  const q = encodeURIComponent(`${card.name} Michael Jordan`);
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${q}`;
  const googleUrl = `https://www.google.com/search?tbm=isch&q=${q}`;

  // Holographic foil scales with rarity — legendary (tier 1) shimmers hardest.
  // Vault cards have no tier, so no foil / neutral border.
  const foilClass = isVault ? "" :
    card.tier_id === 1 ? "foil foil--strong" : card.tier_id === 2 ? "foil" : card.tier_id === 3 ? "foil foil--soft" : "";
  const tierStyle = (isVault ? {} : { ["--border" as string]: `var(--tier-${card.tier_id})` }) as React.CSSProperties;
  const tierName = card.tier_id ? (["Legendary", "Epic", "Rare", "Common"][card.tier_id - 1] ?? "Common") : "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href={isVault ? "/vault" : "/mj-hierarchy"} className="font-sans text-[10px] uppercase tracking-wide text-muted hover:text-foreground">← {isVault ? "Jordan Vault" : "Hierarchy"}</Link>

      <div className="mt-4 grid gap-8 sm:grid-cols-[280px_1fr]">
        <div>
          <div className={cn("relative overflow-hidden rounded-md border border-border/50 bg-card p-1", foilClass)} style={tierStyle}>
            <CardLightbox imageUrl={card.image_url} alt={card.name}>
              <CardThumb card={card} className="w-full !border-0 !shadow-none" />
            </CardLightbox>
          </div>
          {card.image_source && (
            <p className="mt-1.5 text-[10px] text-muted">Image: {card.image_source}</p>
          )}
        </div>

        {/* Item stats dialog */}
        <Panel className="self-start p-5" style={tierStyle}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", isVault ? "bg-accent/12 text-accent" : cn(c.bg, c.text))}
              style={tierStyle}
            >
              {isVault ? "Jordan Vault" : `Tier ${card.tier_id} · ${tierName}`}
            </span>
            {card.is_rookie && <Badge className={c.text}>Rookie</Badge>}
            {card.is_insert && <Badge className={c.text}>Insert</Badge>}
            {card.is_parallel && <Badge className={c.text}>Parallel</Badge>}
          </div>
          <h1 className="mt-4 font-display text-lg leading-relaxed tracking-tight">{card.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {ownerCount > 0
              ? `Owned by ${ownerCount} collector${ownerCount === 1 ? "" : "s"}`
              : "Be the first to add it to your collection"}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="font-sans text-[9px] uppercase tracking-wide text-muted">{k}</dt>
                <dd className="font-data text-lg leading-tight">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <>
                <Link href={`/collection/${card.slug}`}>
                  <Button>Manage in my collection</Button>
                </Link>
                <WantButton cardId={card.id} wanted={wantIds.has(card.id)} />
              </>
            ) : (
              <Link href="/login"><Button>Sign in to track</Button></Link>
            )}
          </div>

          <p className="mt-4 text-xs text-muted">
            Find this card:{" "}
            <a href={ebayUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">eBay</a>
            {" · "}
            <a href={googleUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">Google Images</a>
          </p>
        </Panel>
      </div>

      <Panel className="mt-8 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-sans text-xs uppercase tracking-wide">Market value</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              {prices.some((p) => p.source === "ebay (sold)")
                ? "Real eBay sold prices where available · otherwise estimated · not investment advice"
                : prices.some((p) => p.source?.startsWith("ebay"))
                  ? "eBay asking where available · otherwise estimated · not investment advice"
                  : "Estimated · not investment advice"}
            </span>
            {isAdmin(user?.email) && <RefreshPriceButton cardId={card.id} />}
          </div>
        </div>

        {prices.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {prices
              .slice()
              .sort((a, b) => (a.grade_key === "raw" ? -1 : b.grade_key === "raw" ? 1 : 0))
              .map((p) => {
                const isSold = p.source === "ebay (sold)";
                const isEbay = p.source?.startsWith("ebay");
                const asOf = p.as_of ? new Date(p.as_of).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
                const label = isSold
                  ? `eBay sold${asOf ? ` · ${asOf}` : ""}`
                  : isEbay
                    ? `eBay asking${asOf ? ` · ${asOf}` : ""}`
                    : "estimated";
                return (
                  <div key={p.grade_key} className="rounded-xl border border-border/50 bg-elevated px-3 py-2">
                    <span className="font-sans text-[9px] uppercase text-muted">{p.grade_key}</span>
                    <div className="font-data text-xl leading-none text-foreground">{formatUsd(p.median_cents)}</div>
                    <div className={cn("text-[10px]", isEbay ? "text-accent" : "text-muted")}>
                      {label}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {history.length > 0 ? (
          <div className="mt-4">
            <PriceChart series={history} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No price history yet. Values are estimated/seeded — run{" "}
            <code>npm run seed:prices</code> (see README).
          </p>
        )}
      </Panel>

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="font-sans text-xs uppercase tracking-wide">More from {card.sets?.name ?? "this set"}</h2>
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
