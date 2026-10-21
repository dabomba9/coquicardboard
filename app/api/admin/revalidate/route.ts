import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

// Flush the data caches after a bulk publish (images, prices), so card, set and
// vault pages and the sitemap show it now instead of after their 1h / 24h windows.
// Only the nightly cron did this before. Same secret as the cron, but required:
// unlike the cron route, an unset CRON_SECRET means "closed", not "open".
const TAGS = ["catalog", "prices", "vault-catalog"];

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  for (const t of TAGS) revalidateTag(t, "max");
  return NextResponse.json({ revalidated: TAGS });
}
