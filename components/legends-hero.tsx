"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";
import { playSelect } from "@/lib/sfx";
import { cn } from "@/lib/utils";

type Legend = {
  name: string;
  number: string;
  team: string;
  img: string;
  href: string | null;
  live: boolean;
  accent: string;
};

const LEGENDS: Legend[] = [
  { name: "Jordan", number: "23", team: "Bulls", img: "/legends/jordan.png", href: "/mj-hierarchy", live: true, accent: "#e23b3b" },
  { name: "Kobe", number: "8", team: "Lakers", img: "/legends/bryant.png", href: "/kobe-hierarchy", live: true, accent: "#f5c542" },
  { name: "Clemente", number: "21", team: "Pirates", img: "/legends/clemente.png", href: "/clemente-vault", live: true, accent: "#e8b23a" },
  { name: "Killebrew", number: "3", team: "Twins", img: "/legends/killebrew.png", href: "/killebrew-vault", live: true, accent: "#5aa6f5" },
];

function SlotInner({ l, i }: { l: Legend; i: number }) {
  return (
    <div
      className={cn(
        "group/slot relative flex h-full flex-col overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300",
        l.live
          ? "border-border bg-foreground/[0.05] hover:-translate-y-1.5 focus-within:-translate-y-1.5"
          : "border-border/70 bg-foreground/[0.03] opacity-80 hover:opacity-100"
      )}
      style={{ ["--accent" as string]: l.accent } as React.CSSProperties}
    >
      {/* accent glow behind the sprite (brightens on hover) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 opacity-40 transition-opacity duration-300 group-hover/slot:opacity-80"
        style={{ background: `radial-gradient(60% 60% at 50% 100%, ${l.accent}55, transparent 70%)` }}
        aria-hidden="true"
      />
      {/* live ring */}
      {l.live && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/slot:opacity-100"
          style={{ boxShadow: `inset 0 0 0 1px ${l.accent}, inset 0 0 36px -10px ${l.accent}` }}
          aria-hidden="true"
        />
      )}
      {/* sprite */}
      <div className="relative aspect-[2/3] w-full">
        <Image
          src={l.img}
          alt={`${l.name} — ${l.team} #${l.number}`}
          fill
          unoptimized
          // Above the fold on the homepage — the first sprite is the LCP element,
          // and lazy-loading it is what Next warns about.
          priority={i === 0}
          sizes="(max-width: 768px) 45vw, 22vw"
          className="float-idle pixelated origin-bottom scale-[1.08] object-contain object-bottom drop-shadow-[0_12px_14px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover/slot:scale-[1.13]"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      </div>
      {/* name plate */}
      <div className="relative border-t border-border/60 bg-foreground/[0.05] px-2 py-2.5 text-center backdrop-blur-sm">
        <div className="font-display text-sm uppercase tracking-wide text-foreground">{l.name}</div>
        <div className="font-data text-sm leading-none text-muted">#{l.number} · {l.team}</div>
        <div
          className={cn(
            "mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide",
            l.live ? "text-black" : "border border-border text-muted"
          )}
          style={l.live ? { background: l.accent } : undefined}
        >
          {l.live ? "▶ Select" : "Soon"}
        </div>
      </div>
    </div>
  );
}

export function LegendsHero() {
  return (
    <section
      className="hero-arcade relative overflow-hidden border-b border-border/50 pb-16 pt-28 sm:pt-32"
      style={{ background: "var(--hero-base)" }}
    >
      {/* --- layered dark arcade backdrop --- */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, var(--hero-g1) 0%, var(--hero-g2) 46%, var(--hero-g3) 100%)" }}
      />
      <div className="tile-bg pointer-events-none absolute inset-0" style={{ opacity: 0.16 }} />
      {/* twin floodlights */}
      <div className="pointer-events-none absolute -top-24 left-[18%] h-72 w-72 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(95,211,95,0.16), transparent 70%)" }} />
      <div className="pointer-events-none absolute -top-24 right-[18%] h-72 w-72 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(245,197,66,0.12), transparent 70%)" }} />
      {/* soft spotlight behind the sprite row */}
      <div
        className="pointer-events-none absolute left-1/2 top-[62%] h-[30rem] w-[44rem] max-w-[120%] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(closest-side, rgba(120,200,140,0.16), transparent 70%)" }}
      />
      {/* faint floor line for depth */}
      <div className="pointer-events-none absolute inset-x-0 bottom-20 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--hero-floor), transparent)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, var(--hero-vignette) 100%)" }} />

      {/* Coquí — the stage host, perched bottom-left watching the lineup. Purely
          decorative; desktop-only so it never crowds the centered content. */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden lg:block xl:bottom-6 xl:left-8" aria-hidden="true">
        <div className="relative">
          <div
            className="absolute -inset-8 rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(95,211,95,0.20), transparent 70%)" }}
          />
          <Image
            src="/coqui-mascot.png"
            alt=""
            width={176}
            height={176}
            className="float-idle relative h-40 w-40 object-contain drop-shadow-[0_12px_14px_rgba(0,0,0,0.5)] xl:h-44 xl:w-44"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      </div>

      {/* --- content --- */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
        <p className="font-display text-[10px] uppercase tracking-[0.4em] text-[#b8791b] dark:text-[#ffd84a]/90 sm:text-xs">
          ▸ Legends of the Game
        </p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-tight text-foreground [text-shadow:0_2px_12px_rgba(0,0,0,0.25)] sm:text-6xl lg:text-7xl">
          Coqui Cardboard
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted sm:text-base">
          Track, grade, value, and share the definitive card hierarchies — pick your legend to begin.
        </p>

        {/* character select */}
        <div className="mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {LEGENDS.map((l, i) =>
            l.href ? (
              <Link key={l.name} href={l.href} onMouseEnter={() => playSelect()} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30">
                <SlotInner l={l} i={i} />
              </Link>
            ) : (
              <div key={l.name} onMouseEnter={() => playSelect()}>
                <SlotInner l={l} i={i} />
              </div>
            )
          )}
        </div>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/mj-hierarchy"><Button className="h-12 px-6 text-base">▶ Explore the MJ Hierarchy</Button></Link>
          <Link href="/vault"><Button variant="secondary" className="h-12 border-border px-6 text-base text-foreground hover:bg-foreground/10">Browse the Jordan Vault</Button></Link>
        </div>
      </div>
    </section>
  );
}
