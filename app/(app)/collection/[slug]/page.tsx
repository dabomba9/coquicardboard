import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardBySlug, getMyHoldingsForCard, getCardPrices } from "@/lib/queries";
import { isRealPriceSource } from "@/lib/prices";
import { legendArtForCatalog } from "@/lib/legends";
import { CardThumb } from "@/components/card-thumb";
import { HoldingsManager } from "@/components/holdings-manager";
import { Panel } from "@/components/ui/primitives";
import { cn, formatUsd, TIER_COLORS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ManageCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) notFound();

  const [holdings, allPrices] = await Promise.all([
    getMyHoldingsForCard(card.id),
    getCardPrices(card.id),
  ]);
  // Only REAL marketplace prices, same rule as the public card page. Without this
  // the old fabricated rows rendered here as genuine figures (one card carried a
  // "PSA10 $5,783,321.77"), and 'none' sentinels rendered as a bare "grade —".
  const prices = allPrices.filter((p) => p.median_cents != null && isRealPriceSource(p.source));
  const c = TIER_COLORS[card.tier_id] ?? TIER_COLORS[4];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/collection" className="text-sm text-muted hover:text-foreground">← My Collection</Link>

      <div className="mt-4 grid gap-6 sm:grid-cols-[160px_1fr]">
        <CardThumb card={card} placeholderArt={legendArtForCatalog(card.catalog)} className="w-full" />
        <div>
          {/* Vault cards have no tier — this rendered a bare "Tier" chip. */}
          {card.tier_id != null && (
            <span className={cn("rounded px-2 py-0.5 text-sm ring-1", c.bg, c.text, c.ring)}>
              Tier {card.tier_id}
            </span>
          )}
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{card.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {card.sets?.name}
            {card.card_number ? ` · #${card.card_number}` : ""}
          </p>
          {prices.length > 0 && (
            <p className="mt-2 text-sm">
              Market:{" "}
              {prices.map((p) => (
                <span key={p.grade_key} className="mr-3">
                  <span className="text-muted">{p.grade_key}</span> {formatUsd(p.median_cents)}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-muted">
        Your copies ({holdings.length})
      </h2>
      <div className="mt-3">
        <HoldingsManager cardId={card.id} cardSlug={card.slug} holdings={holdings} />
      </div>

      <Panel className="mt-6 p-4 text-xs text-muted">
        Tip: track the same card multiple times in different grades — e.g. a raw copy and a PSA 10.
        Toggle &ldquo;For trade&rdquo; to surface a copy on your public profile.
      </Panel>
    </div>
  );
}
