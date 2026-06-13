import Link from "next/link";
import { getTiers, getAllCards } from "@/lib/queries";
import { CardThumb } from "@/components/card-thumb";
import { Panel } from "@/components/ui/primitives";
import { LegendsHero } from "@/components/legends-hero";
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
    <div className="-mt-[5.5rem]">
      {/* Hero — "Select your legend" arcade character-select */}
      <LegendsHero />

      {/* Features — quest / menu select */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-sans text-base uppercase tracking-wide">Quest Log</h2>
        <p className="mt-2 text-sm text-muted">More hierarchies and tools are on the way.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* MJ Hierarchy — live */}
          <Link href="/mj-hierarchy" className="group lg:col-span-2">
            <Panel className="h-full overflow-hidden border-[var(--tier-1)] p-5 transition-transform group-hover:-translate-y-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-sans text-[10px] uppercase tracking-wide text-[var(--tier-1)]">● Live</div>
                  <div className="mt-2 font-sans text-sm tracking-wide">The Michael Jordan Hierarchy</div>
                  <div className="mt-2 text-sm text-muted">
                    <span className="font-data text-base text-foreground">{mjTotal}</span> cards · 4 tiers ·
                    track, grade, value & share
                  </div>
                </div>
                <span className="font-sans text-[10px] uppercase text-accent group-hover:underline">Open →</span>
              </div>
              {heroCards.length > 0 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {heroCards.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border/50 bg-card p-1">
                      <CardThumb card={c} />
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </Link>

          {/* Guides */}
          <Link href="/guides" className="group">
            <Panel className="flex h-full flex-col justify-between p-5 transition-transform group-hover:-translate-y-1">
              <div>
                <div className="font-sans text-[10px] uppercase tracking-wide text-muted">Read</div>
                <div className="mt-2 font-sans text-sm tracking-wide">Guides</div>
                <p className="mt-3 text-sm text-muted">Collecting guides — understanding tiers, grading, and value.</p>
              </div>
              <span className="mt-4 font-sans text-[10px] uppercase text-accent group-hover:underline">Browse →</span>
            </Panel>
          </Link>

          {/* Coming soon — locked treasure */}
          <Panel className="p-5 opacity-70 lg:col-span-3">
            <div className="font-sans text-[10px] uppercase tracking-wide text-muted">🔒 Locked</div>
            <div className="mt-2 font-sans text-sm tracking-wide">??? — More player hierarchies</div>
            <p className="mt-3 text-sm text-muted">Kobe, LeBron and more legends — same tools, more quests. Coming soon.</p>
          </Panel>
        </div>
      </section>
    </div>
  );
}
