import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Coqui — the brand mascot, a pixel-art Puerto Rican tree frog.
 *
 * Authored as a character-grid bitmap (one glyph = one pixel) rendered to crisp
 * <rect> cells, so it's diff-reviewable, theme-independent, and animatable per
 * pose with no binary assets. Future upgrade path: swap the <rect> grid for a
 * PNG sprite-sheet behind this same component API.
 *
 * Colors are intentionally fixed hex (not theme vars) — the Coqui reads as the
 * same green character in both the daytime and dungeon themes.
 */

export type CoquiPose = "idle" | "wave" | "celebrate" | "sleeping" | "loading" | "faint";

const PALETTE: Record<string, string> = {
  O: "#173a26", // outline (dark green)
  G: "#3fbf52", // body green
  L: "#74e08a", // light green highlight
  B: "#f3e7c0", // cream belly
  W: "#ffffff", // eye white
  P: "#15212b", // pupil
  M: "#173a26", // mouth (= outline)
};

// 16×16 base body, eyes open. Every row is exactly 16 chars.
const BODY: string[] = [
  "...OOO...OOO....",
  "...OWO...OWO....",
  "...OPO...OPO....",
  "...OGGGGGGGGO...",
  "..OGGGGGGGGGGO..",
  ".OGGGGGGGGGGGGO.",
  ".OGLLGGGGGGLLGO.",
  ".OGGGGGGGGGGGGO.",
  ".OGGBBBBBBBBGGO.",
  ".OGGBBBBBBBBGGO.",
  ".OGGBBMMMMBBGGO.",
  "..OGGGGGGGGGGO..",
  "...OGGGGGGGGO...",
  "...OOGGGGGGOO...",
  "..OLLO....OLLO..",
  "................",
];

// Sleeping: eyes become closed lids (replace the open-eye rows 0–2).
const SLEEP_EYES: string[] = [
  "................",
  "...OOO...OOO....",
  "................",
];

// Winking (loading): left eye closed, right eye open.
const WINK_EYES: string[] = [
  ".......O...OOO..",
  "...OOO.....OWO..",
  "...........OPO..",
];

// Fainted (Game Over): X-X dead eyes.
const FAINT_EYES: string[] = [
  "...P.P...P.P....",
  "....P.....P.....",
  "...P.P...P.P....",
];

// Raised-arm pixels per pose, as [col, row] cells drawn in body green.
const ARMS: Partial<Record<CoquiPose, [number, number][]>> = {
  wave: [
    [14, 6], [15, 5], [15, 4], [15, 3],
  ],
  celebrate: [
    [1, 5], [0, 4], [0, 3], [0, 2],
    [14, 5], [15, 4], [15, 3], [15, 2],
  ],
};

function gridFor(pose: CoquiPose): string[] {
  const rows = [...BODY];
  if (pose === "sleeping") {
    rows.splice(0, 3, ...SLEEP_EYES);
  } else if (pose === "loading") {
    rows.splice(0, 3, ...WINK_EYES);
  } else if (pose === "faint") {
    rows.splice(0, 3, ...FAINT_EYES);
  }
  return rows;
}

export function Coqui({
  pose = "idle",
  size = 64,
  bob = pose === "idle" || pose === "loading",
  className,
  "aria-label": ariaLabel,
}: {
  pose?: CoquiPose;
  size?: number;
  /** Idle bob animation (auto-on for idle/loading). */
  bob?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const rows = gridFor(pose);
  // Open-eyed poses get a periodic eye-blink (eye pixels grouped + animated).
  const blinkEyes = pose === "idle" || pose === "wave" || pose === "celebrate";
  const cells: React.ReactNode[] = [];
  const eyeCells: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const fill = PALETTE[ch];
      if (!fill) continue;
      const rect = <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />;
      if (blinkEyes && (ch === "W" || ch === "P")) eyeCells.push(rect);
      else cells.push(rect);
    }
  });
  const arms = ARMS[pose] ?? [];
  arms.forEach(([x, y], i) => {
    cells.push(<rect key={`arm-${i}`} x={x} y={y} width={1} height={1} fill={PALETTE.G} />);
  });

  return (
    <span
      className={cn("inline-block", bob && "mascot-bob", className)}
      role="img"
      aria-label={ariaLabel ?? "Coqui mascot"}
    >
      <svg
        width={size}
        height={size}
        viewBox="-2 -5 20 22"
        shapeRendering="crispEdges"
        className="pixelated overflow-visible"
        aria-hidden="true"
      >
        {cells}
        {eyeCells.length > 0 && <g className="coqui-eyes">{eyeCells}</g>}
        {pose === "sleeping" && (
          <text
            x={15}
            y={0}
            fontSize={3.5}
            fill="var(--muted)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            z
          </text>
        )}
        {pose === "celebrate" && (
          <>
            <text x={-1} y={-1} fontSize={3} fill="var(--gold)">✦</text>
            <text x={14} y={-1} fontSize={3} fill="var(--gold)">✦</text>
          </>
        )}
      </svg>
    </span>
  );
}

/** Centered loading screen with the bobbing Coqui and an animated caption. */
export function CoquiLoader({
  label = "Loading",
  size = 72,
  className,
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}>
      <Coqui pose="loading" size={size} />
      <p className="font-sans text-[10px] uppercase tracking-widest text-muted">
        {label}
        <span className="skeleton inline-block w-6 align-bottom">&nbsp;</span>
      </p>
    </div>
  );
}
