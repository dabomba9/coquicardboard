/**
 * Refresh the live site's data caches after publishing images or prices.
 *
 *   npx tsx admin/revalidate.ts                 # https://coquicardboard.com
 *   npx tsx admin/revalidate.ts http://localhost:3000
 *
 * Uses CRON_SECRET from .env.local; it must match the one set in Vercel.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const base = process.argv[2] ?? "https://coquicardboard.com";
const secret = process.env.CRON_SECRET;
if (!secret) { console.error("CRON_SECRET is missing from .env.local"); process.exit(1); }

async function main() {
  const res = await fetch(`${base}/api/admin/revalidate`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
  console.log(`${base} → HTTP ${res.status} ${await res.text()}`);
  if (res.status === 401) console.log("401: the CRON_SECRET in .env.local doesn't match Vercel's. Copy Vercel's value into .env.local.");
}
main().catch((e) => { console.error(e); process.exit(1); });
