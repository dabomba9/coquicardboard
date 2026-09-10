import Link from "next/link";
import Image from "next/image";
import { Layers, Library, Award, TrendingUp, Heart, Share2, ArrowRight } from "lucide-react";
import { getTiers, getAllCards } from "@/lib/queries";
import { CardThumb } from "@/components/card-thumb";
import { Panel, Button } from "@/components/ui/primitives";
import { LegendsHero } from "@/components/legends-hero";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import { websiteJsonLd, organizationJsonLd } from "@/lib/structured-data";
import type { Metadata } from "next";
import type { CardWithSet, Tier } from "@/lib/types";

export const dynamic = "force-dynamic";

// The most-linked page on the site was the only public route without a canonical,
// and being force-dynamic it would happily self-index every ?utm_source= / ?fbclid=
// variant as a separate URL.
export const metadata: Metadata = {
  title: "Coqui Cardboard — Michael Jordan & Kobe Bryant card catalogs",
  description:
    "Browse curated card hierarchies and complete player vaults for Michael Jordan, Kobe Bryant, Roberto Clemente and Harmon Killebrew — track what you own, follow market value, and build a want list.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  { Icon: Layers, title: "Track every tier", body: "Quick-add owned copies; watch each tier's completion fill in." },
  { Icon: Award, title: "Grade & condition", body: "Log raw or graded copies (PSA/BGS/SGC) with cert numbers." },
  { Icon: TrendingUp, title: "Real market value", body: "eBay-sourced prices and value-over-time, not guesswork." },
  { Icon: Heart, title: "Build a want list", body: "Prioritize the chase and flag cards you're hunting." },
  { Icon: Share2, title: "Share your collection", body: "A public profile shows off what you own and trade." },
  { Icon: Library, title: "12,000+ card vault", body: "Browse the complete Michael Jordan catalog, beautifully." },
];

export default async function Home() {
  let tiers: Tier[] = [];
  let cards: CardWithSet[] = [];
  try {
    [tiers, cards] = await Promise.all([getTiers(), getAllCards()]);
  } catch {
    /* DB not connected — home still renders */
  }
  const mjTotal = tiers.reduce((s, t) => s + t.card_count, 0) || 378;
  const withImg = cards.filter((c) => c.image_url);
  const hierGrid = withImg.filter((c) => c.tier_id === 1).slice(0, 5);
  const vaultGrid = withImg.slice(5, 10);

  const stats = [
    { n: "24,000+", l: "Cards catalogued" },
    { n: "4", l: "Legends" },
    { n: "7", l: "Catalogs" },
    { n: "eBay", l: "Real values" },
  ];

  return (
    <div className="-mt-[5.5rem]">
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={organizationJsonLd()} />
      <LegendsHero />

      {/* Stats band */}
      <Reveal>
        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l} className="rounded-2xl border border-border/50 bg-card px-4 py-5 text-center">
                <div className="font-data text-3xl leading-none text-foreground">{s.n}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-muted">{s.l}</div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Two catalogs */}
      <Reveal>
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-display text-lg uppercase tracking-tight">Explore the catalogs</h2>
          <p className="mt-1 text-sm text-muted">Curated worlds of vintage and modern cardboard.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* MJ Hierarchy */}
            <Link href="/mj-hierarchy" className="group">
              <Panel className="h-full overflow-hidden p-6 transition-transform group-hover:-translate-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Live
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl uppercase tracking-tight">The MJ Hierarchy</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-data text-base text-foreground">{mjTotal}</span> definitive cards across{" "}
                  <span className="font-data text-base text-foreground">{tiers.length || 4}</span> rarity tiers — track, grade, value & share.
                </p>
                {hierGrid.length > 0 && (
                  <div className="mt-5 grid grid-cols-5 gap-2">
                    {hierGrid.map((c) => <CardThumb key={c.id} card={c} />)}
                  </div>
                )}
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2">Open the hierarchy <ArrowRight size={15} /></span>
              </Panel>
            </Link>

            {/* Mamba Hierarchy */}
            <Link href="/mamba-hierarchy" className="group">
              <Panel className="h-full overflow-hidden p-6 transition-transform group-hover:-translate-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Live
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl uppercase tracking-tight">The Mamba Hierarchy</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-data text-base text-foreground">76</span> definitive Kobe Bryant cards across{" "}
                  <span className="font-data text-base text-foreground">3</span> tiers — the grails, elite, and foundation.
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2">Open the hierarchy <ArrowRight size={15} /></span>
              </Panel>
            </Link>

            {/* Kobe — Mamba Origins */}
            <Link href="/kobe-hierarchy" className="group">
              <Panel className="h-full overflow-hidden p-6 transition-transform group-hover:-translate-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Live
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl uppercase tracking-tight">Mamba Origins</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-data text-base text-foreground">143</span> Kobe Bryant 1996-97 rookie cards across{" "}
                  <span className="font-data text-base text-foreground">25</span> brands — the complete rookie class.
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2">Chase the Mamba <ArrowRight size={15} /></span>
              </Panel>
            </Link>

            {/* Jordan Vault */}
            <Link href="/vault" className="group">
              <Panel className="h-full overflow-hidden p-6 transition-transform group-hover:-translate-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--gold)]">
                    <Library size={12} /> Vault
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl uppercase tracking-tight">The Jordan Vault</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-data text-base text-foreground">12,000+</span> cards — every Michael Jordan issue. Search, filter, and track the ones you own.
                </p>
                {vaultGrid.length > 0 && (
                  <div className="mt-5 grid grid-cols-5 gap-2">
                    {vaultGrid.map((c) => <CardThumb key={c.id} card={c} />)}
                  </div>
                )}
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--gold)] group-hover:gap-2">Browse the vault <ArrowRight size={15} /></span>
              </Panel>
            </Link>

            {/* Kobe Vault */}
            <Link href="/kobe-vault" className="group">
              <Panel className="h-full overflow-hidden p-6 transition-transform group-hover:-translate-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--gold)]">
                    <Library size={12} /> Vault
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl uppercase tracking-tight">The Kobe Vault</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-data text-base text-foreground">11,800+</span> cards — every Kobe Bryant issue from 1996 to today. Search, filter, and track the ones you own.
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--gold)] group-hover:gap-2">Browse the Kobe Vault <ArrowRight size={15} /></span>
              </Panel>
            </Link>

            {/* Clemente Vault */}
            <Link href="/clemente-vault" className="group">
              <Panel className="h-full overflow-hidden p-6 transition-transform group-hover:-translate-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--gold)]">
                    <Library size={12} /> Vault
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl uppercase tracking-tight">The Clemente Vault</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-data text-base text-foreground">256</span> cards — Roberto Clemente&apos;s complete playing-era run, 1955–1973.
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--gold)] group-hover:gap-2">Browse the Clemente Vault <ArrowRight size={15} /></span>
              </Panel>
            </Link>

            {/* Killebrew Vault */}
            <Link href="/killebrew-vault" className="group">
              <Panel className="h-full overflow-hidden p-6 transition-transform group-hover:-translate-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--gold)]">
                    <Library size={12} /> Vault
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl uppercase tracking-tight">The Killebrew Vault</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-data text-base text-foreground">252</span> cards — Harmon Killebrew&apos;s complete playing-era run, 1955–1976.
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--gold)] group-hover:gap-2">Browse the Killebrew Vault <ArrowRight size={15} /></span>
              </Panel>
            </Link>
          </div>
        </section>
      </Reveal>

      {/* Feature grid */}
      <Reveal>
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-display text-lg uppercase tracking-tight">Everything a collector needs</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border/50 bg-card p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/12 text-accent">
                  <Icon size={18} />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Final CTA */}
      <Reveal>
        <section className="mx-auto max-w-4xl px-4 pb-20 pt-4 text-center">
          <div className="rounded-3xl border border-border/50 bg-card px-6 py-12">
            <Image
              src="/coqui-mascot.png"
              alt="Coquí — Coqui Cardboard mascot"
              width={144}
              height={144}
              className="float-idle mx-auto mb-5 h-32 w-32 sm:h-36 sm:w-36"
            />
            <h2 className="font-display text-2xl uppercase tracking-tight sm:text-3xl">Start your collection</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Free to browse. Sign in to track what you own, follow value, and build your want list.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/mj-hierarchy"><Button className="h-11 px-6">Explore the hierarchy</Button></Link>
              <Link href="/login"><Button variant="secondary" className="h-11 px-6">Sign in</Button></Link>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
