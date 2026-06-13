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
  { name: "Kobe", number: "8", team: "Lakers", img: "/legends/bryant.png", href: null, live: false, accent: "#f5c542" },
  { name: "Clemente", number: "21", team: "Pirates", img: "/legends/clemente.png", href: null, live: false, accent: "#e8b23a" },
  { name: "Killebrew", number: "3", team: "Twins", img: "/legends/killebrew.png", href: null, live: false, accent: "#5aa6f5" },
];

function SlotInner({ l }: { l: Legend }) {
  return (
    <div
      className={cn(
        "group/slot pixel-box relative flex h-full flex-col overflow-hidden transition-transform",
        l.live ? "hover:-translate-y-1.5 focus-within:-translate-y-1.5" : "opacity-90"
      )}
      style={{
        background: "rgba(10, 8, 30, 0.66)",
        ["--border" as string]: l.live ? l.accent : "var(--border)",
      } as React.CSSProperties}
    >
      {/* hover glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover/slot:opacity-100 group-focus-within/slot:opacity-100"
        style={{ boxShadow: `inset 0 0 34px -8px ${l.accent}` }}
        aria-hidden="true"
      />
      {/* sprite */}
      <div className="relative aspect-[2/3] w-full">
        <Image
          src={l.img}
          alt={`${l.name} — ${l.team} #${l.number}`}
          fill
          unoptimized
          sizes="(max-width: 768px) 45vw, 22vw"
          className="pixelated origin-bottom scale-[1.08] object-contain object-bottom drop-shadow-[0_10px_12px_rgba(0,0,0,0.6)]"
        />
      </div>
      {/* name plate */}
      <div className="border-t-2 border-border bg-[#0a0818]/85 px-2 py-2 text-center">
        <div className="font-display text-xs uppercase tracking-wide text-foreground">{l.name}</div>
        <div className="font-data text-sm leading-none text-muted">#{l.number} · {l.team}</div>
        <div
          className={cn(
            "mt-1.5 inline-block px-1.5 py-0.5 font-display text-[9px] uppercase leading-none",
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
      className="relative overflow-hidden border-b-2 border-border pb-14 pt-28 sm:pt-32"
      style={{ background: "#0c0a22" }}
    >
      {/* --- clean dark arcade backdrop --- */}
      {/* deep gradient — a touch of light up top, fading to near-black */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, #161232 0%, #0e0b26 46%, #07061a 100%)" }}
      />
      {/* subtle pixel grid texture */}
      <div className="tile-bg pointer-events-none absolute inset-0" style={{ opacity: 0.18 }} />
      {/* soft spotlight behind the sprite row */}
      <div
        className="pointer-events-none absolute left-1/2 top-[60%] h-[30rem] w-[42rem] max-w-[120%] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(closest-side, rgba(150,160,255,0.14), transparent 70%)" }}
      />
      {/* vignette */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />

      {/* --- content --- */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
        <h1 className="marquee-gold font-display text-4xl uppercase leading-none tracking-tight sm:text-5xl lg:text-6xl">
          Coqui Cardboard
        </h1>
        <p className="mt-3 font-display text-[10px] uppercase tracking-[0.35em] text-[#ffd84a] sm:text-xs">
          ▸ Legends of the Game · Select your legend
        </p>

        {/* character select */}
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {LEGENDS.map((l) =>
            l.href ? (
              <Link key={l.name} href={l.href} onMouseEnter={() => playSelect()} className="block focus:outline-none">
                <SlotInner l={l} />
              </Link>
            ) : (
              <div key={l.name} onMouseEnter={() => playSelect()}>
                <SlotInner l={l} />
              </div>
            )
          )}
        </div>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/mj-hierarchy"><Button className="h-12 px-6 text-base">▶ Explore the MJ Hierarchy</Button></Link>
          <Link href="/guides"><Button variant="secondary" className="h-12 px-6 text-base">Read the guides</Button></Link>
        </div>
      </div>
    </section>
  );
}
