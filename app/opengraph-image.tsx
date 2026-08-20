import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Coqui Cardboard — collecting tools & guides";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return brandOgImage("Collecting tools and guides, built for the hobby");
}
