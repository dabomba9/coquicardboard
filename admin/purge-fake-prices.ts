/**
 * Remove fabricated/estimated pricing so only REAL eBay-sourced prices remain.
 * Keeps real comps (and the cron's 'none' no-comp sentinel); deletes everything
 * else (the old 'estimated'/'manual' placeholder rows + their history).
 *
 *   npx tsx admin/purge-fake-prices.ts
 *
 * Add --cloud to target the cloud DB (requires CLOUD_SUPABASE_URL +
 * CLOUD_SERVICE_ROLE_KEY; it will not fall back to local). Idempotent.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const cloud = process.argv.includes("--cloud");
// Hard-fail rather than fall back: `(cloud && CLOUD_URL) || LOCAL_URL` silently
// DELETED FROM LOCAL when CLOUD_* was unset or misspelled. This script is
// destructive, so an unresolvable --cloud must stop, not pick another database.
if (cloud && !(process.env.CLOUD_SUPABASE_URL && process.env.CLOUD_SERVICE_ROLE_KEY)) {
  console.error("--cloud requires CLOUD_SUPABASE_URL and CLOUD_SERVICE_ROLE_KEY. Refusing to fall back to local.");
  process.exit(1);
}
const url = cloud ? process.env.CLOUD_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = cloud ? process.env.CLOUD_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase URL or service-role key in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const KEEP_PRICES = ["ebay (sold)", "ebay (asking)", "none"];
const KEEP_HISTORY = ["ebay", "ebay-sold"];

const notKept = (keep: string[]) => `(${keep.map((s) => `"${s}"`).join(",")})`;

async function count(table: string): Promise<number> {
  const { count } = await db.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

// How many rows the delete below would remove — printed first so the operator
// sees the blast radius against the resolved target before anything is dropped.
async function doomed(table: string, keep: string[]): Promise<number> {
  const { count } = await db.from(table).select("*", { count: "exact", head: true }).not("source", "in", notKept(keep));
  return count ?? 0;
}

async function main() {
  console.log(`Purging fabricated prices — target: ${new URL(url!).host}${cloud ? " (CLOUD)" : " (local)"}`);
  console.log(`  before → card_prices ${await count("card_prices")}, price_history ${await count("price_history")}`);
  console.log(`  to delete → card_prices ${await doomed("card_prices", KEEP_PRICES)}, price_history ${await doomed("price_history", KEEP_HISTORY)}`);

  const { error: e1 } = await db.from("card_prices").delete().not("source", "in", notKept(KEEP_PRICES));
  if (e1) throw e1;
  const { error: e2 } = await db.from("price_history").delete().not("source", "in", notKept(KEEP_HISTORY));
  if (e2) throw e2;

  console.log(`  after  → card_prices ${await count("card_prices")}, price_history ${await count("price_history")}`);
  console.log("Done. Only real eBay-sourced prices remain.");
}

main().catch((e) => { console.error("\npurge-fake-prices failed:", e); process.exit(1); });
