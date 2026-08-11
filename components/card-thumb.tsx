"use client";

import Image from "next/image";
import { useState } from "react";
import { playSelect } from "@/lib/sfx";
import { cn, TIER_COLORS } from "@/lib/utils";
import type { CardWithSet } from "@/lib/types";

type ThumbCard = Pick<CardWithSet, "name" | "card_number" | "year" | "tier_id"> & {
  image_url?: string | null;
  sets?: { name: string } | null;
};

// Deterministic per-card foil variation (CSS vars consumed by .foil when present),
// so every card's holographic sweep differs in phase/speed/angle/tint instead of
// shimmering in lockstep. Seeded from the card → SSR-stable, no hydration mismatch.
function foilVars(seed: string): React.CSSProperties {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const r = (shift: number) => ((h >>> shift) & 0xff) / 255; // 0..1 from a byte slice
  return {
    ["--foil-delay" as string]: `-${(r(0) * 6).toFixed(2)}s`,
    ["--foil-dur" as string]: `${(4.5 + r(8) * 3).toFixed(2)}s`,
    ["--foil-angle" as string]: `${Math.round(95 + r(16) * 55)}deg`,
    ["--foil-hue" as string]: `${Math.round(r(24) * 70)}deg`,
  } as React.CSSProperties;
}

// Renders the card's external image when available; falls back to a styled,
// tier-colored placeholder (year/set/number) if absent or if the URL fails.
// `placeholderArt` (a local asset path) puts legend art behind that placeholder —
// used where a card has no verified image and a wrong one would be worse than none.
export function CardThumb({
  card,
  className,
  placeholderArt,
}: {
  card: ThumbCard;
  className?: string;
  placeholderArt?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const c = TIER_COLORS[card.tier_id] ?? TIER_COLORS[4];
  const showImage = card.image_url && !failed;

  return (
    <div
      onMouseEnter={() => playSelect()}
      style={foilVars(`${card.name}${card.card_number ?? ""}`)}
      className={cn(
        "relative flex aspect-[5/7] flex-col justify-between overflow-hidden rounded-md border border-border/50",
        !showImage && "p-3",
        showImage ? "bg-card" : c.bg,
        className
      )}
    >
      {showImage ? (
        <>
          {/* shimmer until the image decodes, then fade it in (no pop-in) */}
          {!loaded && <span className="skeleton absolute inset-0" aria-hidden="true" />}
          <Image
            src={card.image_url!}
            alt={card.name}
            fill
            sizes="(max-width: 768px) 25vw, 12vw"
            className={cn(
              "object-cover transition-[transform,opacity] duration-300 group-hover:scale-[1.05]",
              loaded ? "opacity-100" : "opacity-0"
            )}
            unoptimized
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <>
          {placeholderArt && (
            <>
              <Image
                src={placeholderArt}
                alt=""
                fill
                sizes="(max-width: 768px) 25vw, 12vw"
                className="pointer-events-none object-contain object-center p-4 opacity-70 mix-blend-luminosity"
                aria-hidden="true"
                unoptimized
              />
              {/* scrim so the card name stays readable over the art */}
              <span
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent"
                aria-hidden="true"
              />
            </>
          )}
          <div className={cn("relative font-sans text-[9px] uppercase tracking-wide", c.text)}>
            {card.year ?? ""}
          </div>
          <div className="relative space-y-0.5">
            <div className={cn("line-clamp-3 text-xs font-medium leading-tight", placeholderArt && "text-white")}>
              {card.name}
            </div>
            {card.sets?.name && (
              <div className={cn("text-[10px]", placeholderArt ? "text-white/70" : "text-muted")}>{card.sets.name}</div>
            )}
            {card.card_number && (
              <div className={cn("font-data text-xs", placeholderArt ? "text-white/70" : "text-muted")}>
                #{card.card_number}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
