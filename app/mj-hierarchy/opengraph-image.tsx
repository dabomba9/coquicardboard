import { catalogOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getCatalogCounts } from "@/lib/queries";

export const alt = "The Michael Jordan Card Hierarchy · Coqui Cardboard";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  // Counts are a nice-to-have: a card without stats still shares fine, a card that
  // throws does not. Fall back to the static line if the catalog read fails.
  let subtitle = "Michael Jordan cards ranked across four tiers";
  try {
    const { total, withImage } = await getCatalogCounts("mj-hierarchy");
    if (total) subtitle = `${total.toLocaleString()} cards · ${withImage.toLocaleString()} with images`;
  } catch {}
  return catalogOgImage("The Michael Jordan Card Hierarchy", subtitle);
}
