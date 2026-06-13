"use client";

import { useEffect, useRef, useState } from "react";
import { cn, TIER_COLORS } from "@/lib/utils";

/**
 * PixelCard — renders a real card image as crisp 32-bit pixel art.
 *
 * Draws the source image into a tiny backing canvas (~px × px·7/5) and lets CSS
 * upscale it with `image-rendering: pixelated`, producing chunky pixel blocks
 * from any photo. Cross-origin images only taint the canvas (readback blocked);
 * displaying it is fine, so no CORS handshake is needed.
 */
export function PixelCard({
  src,
  alt,
  tierId = 1,
  px = 80,
  posterize = true,
  className,
}: {
  src?: string | null;
  alt: string;
  tierId?: number;
  /** Backing-store width in pixels — lower = chunkier. */
  px?: number;
  /** Apply the posterize/color-grade "illustration" filter to the canvas. */
  posterize?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const [drawn, setDrawn] = useState(false);

  // Lazy: only load + pixelate once the card nears the viewport (matters when a
  // page renders hundreds of these — avoids a thundering herd of image loads).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !src) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.onload = () => {
      const w = px;
      const h = Math.round((px * 7) / 5);
      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingEnabled = true; // clean averaged downsample
      // Cover-fit the source into the 5:7 frame.
      const ir = img.width / img.height;
      const cr = w / h;
      let sw = img.width;
      let sh = img.height;
      let sx = 0;
      let sy = 0;
      if (ir > cr) {
        sw = img.height * cr;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / cr;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      setDrawn(true);
      setFailed(false);
    };
    img.onerror = () => setFailed(true);
    img.src = src;
  }, [inView, src, px]);

  const c = TIER_COLORS[tierId] ?? TIER_COLORS[4];

  return (
    <div
      ref={containerRef}
      className={cn("pixel-box relative aspect-[5/7] overflow-hidden bg-card", className)}
      role="img"
      aria-label={alt}
    >
      {/* Canvas stays mounted once in view (so the ref is available to draw into);
          hidden until drawn, and behind the fallback if the image errors. */}
      {src && inView && (
        <canvas
          ref={canvasRef}
          className={cn("pixelated block h-full w-full", posterize && "card-illus", (!drawn || failed) && "invisible")}
        />
      )}
      {src && !drawn && !failed && <div className="skeleton !absolute inset-0" />}
      {/* Retro dither texture over the illustrated art. */}
      {posterize && drawn && !failed && <div className="dither-overlay" aria-hidden="true" />}
      {(!src || failed) && (
        <div className={cn("absolute inset-0 flex items-center justify-center p-2 text-center", c.bg)}>
          <span className="font-display text-[8px] uppercase leading-tight">{alt}</span>
        </div>
      )}
    </div>
  );
}
