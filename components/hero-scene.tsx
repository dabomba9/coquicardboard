"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PixelCard } from "@/components/pixel-card";
import { CoquiGlyph } from "@/components/coqui-glyph";
import { Button } from "@/components/ui/primitives";
import { playSelect, playConfirm } from "@/lib/sfx";

type HeroCard = { id: string; slug: string; name: string; tier_id: number; image_url: string | null };

// Fanned "hand" — arc + overlap + center-on-top stacking. Outer two hidden < md.
const FAN = [
  { rot: -16, ty: 28, z: "z-10", vis: "hidden md:block" },
  { rot: -8, ty: 10, z: "z-20", vis: "" },
  { rot: 0, ty: 0, z: "z-30", vis: "" },
  { rot: 8, ty: 10, z: "z-20", vis: "" },
  { rot: 16, ty: 28, z: "z-10", vis: "hidden md:block" },
];

const TIER_NAME = ["Pinnacle", "Elite", "Core", "Foundation"];

export function HeroScene({ cards }: { cards: HeroCard[] }) {
  const rootRef = useRef<HTMLElement>(null);

  // Cursor parallax → CSS vars --mx/--my (−1..1) on the root. Skip reduced-motion.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", mx.toFixed(3));
        el.style.setProperty("--my", my.toFixed(3));
      });
    };
    const onLeave = () => {
      el.style.setProperty("--mx", "0");
      el.style.setProperty("--my", "0");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className="tile-bg tile-drift relative flex min-h-[88vh] items-center overflow-hidden border-b-2 border-border"
    >
      {/* Layered backdrop: jewel-tone glow + top accent + grain + vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 85% at 50% 118%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 58%)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
      <div className="grain pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(115% 100% at 50% 38%, transparent 52%, color-mix(in oklab, var(--shadow-ink) 42%, transparent) 100%)" }}
      />

      {/* Taíno coquí backdrop emblem (parallax) */}
      <div className="parallax-emblem pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent opacity-[0.12]">
        <CoquiGlyph size={480} aria-label="" />
      </div>

      {/* Text + fanned card centerpiece */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-16 text-center">
        <p className="font-sans text-xs uppercase tracking-[0.3em] text-accent">▸ Press Start</p>
        <h1 className="pixel-shadow mt-5 font-display text-6xl leading-[0.78] tracking-tight sm:text-7xl lg:text-8xl xl:text-[7rem]">
          <span className="block text-foil-gold">COQUI</span>
          <span className="block">CARDBOARD</span>
        </h1>

        {/* Fanned hand of pixel cards (clickable) — 3D pointer-tilt + spotlight */}
        <div className="hero-tilt relative">
          <div
            className="spotlight pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 sm:h-80 sm:w-80"
            aria-hidden="true"
          />
          <div className="float-card mt-12 flex origin-top scale-[0.7] items-end justify-center sm:scale-90 lg:scale-100">
            {cards.slice(0, FAN.length).map((c, i) => (
              <div key={c.id} className={cn("deal-card", FAN[i].vis)} style={{ animationDelay: `${i * 0.09}s` }}>
                <Link
                  href={`/cards/${c.slug}`}
                  onMouseEnter={() => playSelect()}
                  aria-label={`${c.name} — Tier ${c.tier_id}`}
                  className={cn(
                    "group relative -ml-10 block transition-transform first:ml-0 hover:z-40 hover:scale-105 focus-visible:z-40 focus-visible:scale-105 focus-visible:outline-none",
                    FAN[i].z
                  )}
                  style={{ rotate: `${FAN[i].rot}deg`, translate: `0 ${FAN[i].ty}px` }}
                >
                  <PixelCard
                    src={c.image_url}
                    alt={c.name}
                    tierId={c.tier_id}
                    className={cn("card-drop w-40", i === 2 ? "foil [--border:var(--gold)]" : "foil foil--soft")}
                  />
                  <span className="pixel-box pointer-events-none absolute -bottom-9 left-1/2 w-max max-w-[12rem] -translate-x-1/2 bg-elevated px-2 py-1 text-center font-sans text-[10px] leading-tight text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {c.name}
                    <span className="block text-[var(--tier-1)]">
                      Tier {c.tier_id} · {TIER_NAME[c.tier_id - 1] ?? ""}
                    </span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Glossy surface the hand rests on */}
        <div className="glossy-surface mx-auto mt-4 w-80 max-w-[75%]" />

        <p className="mx-auto mt-10 max-w-md text-sm text-muted">
          Track the Michael Jordan card hierarchy — grade your copies, follow market value,
          build a want list, and share your collection.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/mj-hierarchy">
            <Button onClick={() => playConfirm()} className="h-12 px-6 text-base">▶ Explore the MJ Hierarchy</Button>
          </Link>
          <Link href="/guides">
            <Button variant="secondary" className="h-12 px-6 text-base">Read the guides</Button>
          </Link>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
        <span className="scroll-cue inline-block font-sans text-[10px] uppercase tracking-[0.2em] text-muted">▼ Scroll</span>
      </div>
    </section>
  );
}
