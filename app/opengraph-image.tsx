import { ImageResponse } from "next/og";
import { COQUI_GLYPH, GLYPH_W, GLYPH_H } from "@/lib/coqui-glyph-data";

export const alt = "Coqui Cardboard — collecting tools & guides";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c1026",
          color: "#eef0ff",
          // Faux pixel grid backdrop.
          backgroundImage:
            "linear-gradient(rgba(95,211,95,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(95,211,95,0.06) 2px, transparent 2px)",
          backgroundSize: "32px 32px",
        }}
      >
        <img src={glyphSvg(8)} width={GLYPH_W * 8} height={GLYPH_H * 8} alt="" />
        <div style={{ display: "flex", gap: 18, marginTop: 28, fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>
          <span style={{ color: "#5fd35f" }}>COQUI</span>
          <span>CARDBOARD</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 30, color: "#9aa1d4" }}>
          Collecting tools and guides, built for the hobby
        </div>
      </div>
    ),
    { ...size }
  );
}
