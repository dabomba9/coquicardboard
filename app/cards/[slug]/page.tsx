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

  const c = TIER_COLORS[card.tier_id] ?? TIER_COLORS[4];
  const cardType = typeof card.attributes?.type === "string" ? card.attributes.type : null;
  const facts: [string, string | null][] = [
    ["Set", card.sets?.name ?? null],
    ["Year", card.year ? String(card.year) : null],
    ["Card #", card.card_number ? `#${card.card_number}` : null],
    ["Type", cardType],
    ["Manufacturer", card.sets?.manufacturer ?? null],
    ["Print run", card.print_run ? `/${card.print_run}` : card.serial_numbered ? "Serial #'d" : null],
    ["Pack odds", card.pack_odds],
  ];

  const q = encodeURIComponent(`${card.name} Michael Jordan`);
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${q}`;
  const googleUrl = `https://www.google.com/search?tbm=isch&q=${q}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/mj-hierarchy" className="text-sm text-muted hover:text-foreground">← Hierarchy</Link>

      <div className="mt-4 grid gap-8 sm:grid-cols-[220px_1fr]">
        <div>
          <CardLightbox imageUrl={card.image_url} alt={card.name}>
            <CardThumb card={card} className="w-full" />
          </CardLightbox>
          {card.image_source && (
            <p className="mt-1.5 text-[10px] text-muted">Image: {card.image_source}</p>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded px-2 py-0.5 text-sm ring-1", c.bg, c.text, c.ring)}>
              Tier {card.tier_id}
            </span>
            {card.is_rookie && <Badge className={cn(c.bg, c.text, c.ring)}>Rookie</Badge>}
            {card.is_insert && <Badge className={cn(c.bg, c.text, c.ring)}>Insert</Badge>}
            {card.is_parallel && <Badge className={cn(c.bg, c.text, c.ring)}>Parallel</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{card.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {ownerCount > 0
              ? `Owned by ${ownerCount} collector${ownerCount === 1 ? "" : "s"}`
              : "Be the first to add it to your collection"}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex gap-3">
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
            <a href={ebayUrl} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">eBay</a>
            {" · "}
            <a href={googleUrl} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">Google Images</a>
          </p>
        </div>
      </div>

      <Panel className="mt-8 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Market value</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              {prices.some((p) => p.source?.startsWith("ebay"))
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
                const isEbay = p.source?.startsWith("ebay");
                const asOf = p.as_of ? new Date(p.as_of).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
                return (
                  <div key={p.grade_key}>
                    <span className="text-xs text-muted">{p.grade_key}</span>{" "}
                    <span className="font-medium">{formatUsd(p.median_cents)}</span>
                    <div className={cn("text-[10px]", isEbay ? "text-emerald-600 dark:text-emerald-400" : "text-muted")}>
                      {isEbay ? `eBay asking${asOf ? ` · ${asOf}` : ""}` : "estimated"}
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
          <h2 className="text-sm font-semibold">More from {card.sets?.name ?? "this set"}</h2>
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
