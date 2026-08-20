import { catalogOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { GUIDES } from "@/data/guides";

export const alt = "Guides · Coqui Cardboard";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return catalogOgImage("Collector Guides", `${GUIDES.length} guide${GUIDES.length === 1 ? "" : "s"} for the hobby`);
}
