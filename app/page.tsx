import Link from "next/link";
import { getTiers, getAllCards } from "@/lib/queries";
import { CardThumb } from "@/components/card-thumb";
import { Button, Panel } from "@/components/ui/primitives";
import type { CardWithSet, Tier } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let tiers: Tier[] = [];
  let cards: CardWithSet[] = [];
  try {
    [tiers, cards] = await Promise.all([getTiers(), getAllCards()]);
  } catch {
    /* DB not connected — home still renders */
  }
  const mjTotal = tiers.reduce((s, t) => s + t.card_count, 0) || 378;
  const heroCards = cards.filter((c) => c.tier_id === 1 && c.image_url).slice(0, 5);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center lg:py-28">
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-muted shadow-sm dark:shadow-none">
            Coqui Cardboard
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Collecting tools & guides, built for the <span className="text-amber-500">hobby</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Track tiered card hierarchies copy-by-copy with grades, market value, want lists, and
            sharable collections — starting with the definitive Michael Jordan hierarchy.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/mj-hierarchy"><Button>Explore the MJ Hierarchy</Button></Link>
            <Link href="/guides"><Button variant="secondary">Read the guides</Button></Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-xl font-semibold tracking-tight">Features</h2>
        <p className="mt-1 text-sm text-muted">More hierarchies and tools are on the way.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* MJ Hierarchy — live */}
          <Link href="/mj-hierarchy" className="group lg:col-span-2">
            <Panel className="h-full overflow-hidden p-5 ring-1 ring-amber-500/30 transition-transform group-hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Live</div>
                  <div className="mt-1 text-lg font-semibold">The Michael Jordan Hierarchy</div>
                  <div className="text-sm text-muted">{mjTotal} cards · 4 tiers · track, grade, value & share</div>
                </div>
                <span className="text-sm text-amber-500 group-hover:underline">Open →</span>
              </div>
              {heroCards.length > 0 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {heroCards.map((c) => <CardThumb key={c.id} card={c} />)}
                </div>
              )}
            </Panel>
          </Link>

          {/* Guides */}
          <Link href="/guides" className="group">
            <Panel className="flex h-full flex-col justify-between p-5 transition-transform group-hover:-translate-y-0.5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Read</div>
                <div className="mt-1 text-lg font-semibold">Guides</div>
                <p className="mt-2 text-sm text-muted">Collecting guides — understanding tiers, grading, and value.</p>
              </div>
              <span className="mt-4 text-sm text-amber-500 group-hover:underline">Browse →</span>
            </Panel>
          </Link>

          {/* Coming soon */}
          <Panel className="p-5 opacity-70 lg:col-span-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Coming soon</div>
            <div className="mt-1 text-lg font-semibold">More player hierarchies</div>
            <p className="mt-2 text-sm text-muted">Kobe, LeBron and more — same tools, more legends.</p>
          </Panel>
        </div>
      </section>
    </div>
  );
}
