import { ImageResponse } from "next/og";
import { COQUI_GLYPH, GLYPH_W, GLYPH_H } from "@/lib/coqui-glyph-data";

// Shared Open Graph share-card renderer. Every route segment with an
// `opengraph-image.tsx` calls this, so all social cards stay one brand.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Taíno coquí brand glyph (same bitmap as the favicon/nav mark), embedded as an SVG
// data URI so the OG renderer (Satori) can draw it as an <img>. Monochrome accent green.
const ACCENT = "#5fd35f";
function glyphSvg(px: number) {
  let rects = "";
  COQUI_GLYPH.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "1") rects += `<rect x='${x * px}' y='${y * px}' width='${px}' height='${px}' fill='${ACCENT}'/>`;
    }
  });
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${GLYPH_W * px}' height='${GLYPH_H * px}' shape-rendering='crispEdges'>${rects}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * The site-wide card: big wordmark over the glyph. Used for `/`.
 */
export function brandOgImage(subtitle: string) {
  return new ImageResponse(
    (
      <div style={shell}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders this to a
            PNG; next/image does not exist inside ImageResponse. */}
        <img src={glyphSvg(8)} width={GLYPH_W * 8} height={GLYPH_H * 8} alt="" />
        <div style={{ display: "flex", gap: 18, marginTop: 28, fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>
          <span style={{ color: ACCENT }}>COQUI</span>
          <span>CARDBOARD</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 30, color: "#8ba596" }}>{subtitle}</div>
      </div>
    ),
    { ...OG_SIZE }
  );
}

/**
 * A catalog card: small wordmark, the catalog's name, and its counts. `subtitle`
 * is optional because the callers fetch counts from the database — a share image
 * that renders without stats beats one that fails to render at all.
 */
export function catalogOgImage(title: string, subtitle?: string) {
  return new ImageResponse(
    (
      <div style={{ ...shell, alignItems: "flex-start", justifyContent: "center", padding: "0 84px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img src={glyphSvg(3)} width={GLYPH_W * 3} height={GLYPH_H * 3} alt="" />
          <div style={{ display: "flex", gap: 8, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ color: ACCENT }}>COQUI</span>
            <span>CARDBOARD</span>
          </div>
        </div>
        <div style={{ marginTop: 30, fontSize: 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, maxWidth: 940 }}>
          {title}
        </div>
        {subtitle && <div style={{ marginTop: 20, fontSize: 34, color: "#8ba596" }}>{subtitle}</div>}
        <div style={{ marginTop: 34, fontSize: 24, color: ACCENT }}>coquicardboard.com</div>
      </div>
    ),
    { ...OG_SIZE }
  );
}

const shell: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#0b1712",
  color: "#e9f1ea",
  // Faux pixel grid backdrop.
  backgroundImage:
    "linear-gradient(rgba(95,211,95,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(95,211,95,0.06) 2px, transparent 2px)",
  backgroundSize: "32px 32px",
};
