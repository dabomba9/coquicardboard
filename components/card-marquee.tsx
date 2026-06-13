"use client";

import Image from "next/image";

/**
 * A slow, seamless auto-scrolling row of real card images. The image list is
 * duplicated so the CSS translateX(-50%) loop is seamless; pauses on hover and
 * halts under prefers-reduced-motion (see .marquee-track in globals.css).
 */
export function CardMarquee({ images, durationSec = 70 }: { images: string[]; durationSec?: number }) {
  if (images.length === 0) return null;
  const row = [...images, ...images]; // duplicate for a seamless loop

  return (
    <div
      className="marquee-mask group relative overflow-hidden"
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}
      aria-hidden="true"
    >
      <div className="marquee-track gap-4 py-2" style={{ ["--marquee-duration" as string]: `${durationSec}s` }}>
        {row.map((src, i) => (
          <div
            key={i}
            className="relative aspect-[5/7] w-28 shrink-0 overflow-hidden rounded-md border border-border/50 bg-card shadow-sm transition-transform duration-300 hover:-translate-y-1 sm:w-32"
          >
            <Image src={src} alt="" fill unoptimized sizes="128px" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
