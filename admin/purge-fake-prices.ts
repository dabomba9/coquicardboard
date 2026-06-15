/**
 * Remove fabricated/estimated pricing so only REAL eBay-sourced prices remain.
 * Keeps real comps (and the cron's 'none' no-comp sentinel); deletes everything
 * else (the old 'estimated'/'manual' placeholder rows + their history).
 *
 *   npx tsx admin/purge-fake-prices.ts
 *
 * Add --cloud to target the cloud DB (CLOUD_* env if present). Idempotent.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const cloud = process.argv.includes("--cloud");
const url = (cloud && process.env.CLOUD_SUPABASE_URL) || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = (cloud && process.env.CLOUD_SERVICE_ROLE_KEY) || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase URL or service-role key in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const KEEP_PRICES = ["ebay (sold)", "ebay (asking)", "none"];
const KEEP_HISTORY = ["ebay", "ebay-sold"];

async function count(table: string): Promise<number> {
  const { count } = await db.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

async function main() {
  console.log(`Purging fabricated prices${cloud ? " (cloud)" : ""}…`);
  console.log(`  before → card_prices ${await count("card_prices")}, price_history ${await count("price_history")}`);

  const { error: e1 } = await db.from("card_prices").delete().not("source", "in", `(${KEEP_PRICES.map((s) => `"${s}"`).join(",")})`);
  if (e1) throw e1;
  const { error: e2 } = await db.from("price_history").delete().not("source", "in", `(${KEEP_HISTORY.map((s) => `"${s}"`).join(",")})`);
  if (e2) throw e2;

  console.log(`  after  → card_prices ${await count("card_prices")}, price_history ${await count("price_history")}`);
  console.log("Done. Only real eBay-sourced prices remain.");
}

main().catch((e) => { console.error("\npurge-fake-prices failed:", e); process.exit(1); });
