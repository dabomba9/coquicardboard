import * as React from "react";
import { cn } from "@/lib/utils";
import { COQUI_GLYPH, GLYPH_W, GLYPH_H } from "@/lib/coqui-glyph-data";

/**
 * CoquiGlyph — the brand LOGO MARK: a pixelized Taíno coquí petroglyph.
 *
 * Monochrome (fills with `currentColor`), so wrapping it in a `text-accent` (or
 * any text color) container themes it and adapts to light/dark automatically.
 * Distinct from the green cartoon <Coqui> mascot, which carries in-app personality.
 *
 * The grid lives in lib/coqui-glyph-data.ts and is regenerated from the source
 * art via scripts/pixelize-glyph.py.
 */
export function CoquiGlyph({
  size = 24,
  className,
  "aria-label": ariaLabel,
}: {
  size?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const cells: React.ReactNode[] = [];
  COQUI_GLYPH.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "1") {
        // +0.5 overlap removes hairline seams between adjacent pixels.
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.05} height={1.05} fill="currentColor" />);
      }
    }
  });
  return (
    <svg
      width={(size * GLYPH_W) / GLYPH_H}
      height={size}
      viewBox={`0 0 ${GLYPH_W} ${GLYPH_H}`}
      shapeRendering="crispEdges"
      className={cn("pixelated", className)}
      role="img"
      aria-label={ariaLabel ?? "Coquí"}
    >
      {cells}
    </svg>
  );
}
