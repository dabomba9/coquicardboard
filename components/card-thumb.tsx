"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, TIER_COLORS } from "@/lib/utils";
import type { CardWithSet } from "@/lib/types";

type ThumbCard = Pick<CardWithSet, "name" | "card_number" | "year" | "tier_id"> & {
  image_url?: string | null;
  sets?: { name: string } | null;
};

// Renders the card's external image when available; falls back to a styled,
// tier-colored placeholder (year/set/number) if absent or if the URL fails.
export function CardThumb({ card, className }: { card: ThumbCard; className?: string }) {
  const [failed, setFailed] = useState(false);
  const c = TIER_COLORS[card.tier_id] ?? TIER_COLORS[4];
  const showImage = card.image_url && !failed;

  return (
    <div
      className={cn(
        "pixel-box relative flex aspect-[5/7] flex-col justify-between overflow-hidden",
        !showImage && "p-3",
        showImage ? "bg-card" : c.bg,
        className
      )}
    >
      {showImage ? (
        <Image
          src={card.image_url!}
          alt={card.name}
          fill
          sizes="(max-width: 768px) 25vw, 12vw"
          className="pixelated object-cover transition-transform duration-300 group-hover:scale-[1.05]"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <div className={cn("font-sans text-[9px] uppercase tracking-wide", c.text)}>
            {card.year ?? ""}
          </div>
          <div className="space-y-0.5">
            <div className="line-clamp-3 text-xs font-medium leading-tight">{card.name}</div>
            {card.sets?.name && <div className="text-[10px] text-muted">{card.sets.name}</div>}
            {card.card_number && <div className="font-data text-xs text-muted">#{card.card_number}</div>}
          </div>
        </>
      )}
    </div>
  );
}
