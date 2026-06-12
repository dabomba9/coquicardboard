/**
 * eBay connectivity diagnostic (no DB). Tells you whether your keys work and
 * whether Marketplace Insights (sold comps) is approved — against a sample card.
 *
 *   npm run ebay:check
 *
 * Reads EBAY_CLIENT_ID / EBAY_CLIENT_SECRET from .env.local.
 */
import { config } from "dotenv";
import {
  ebayConfigured,
  searchEbayListings,
  searchEbaySoldItems,
  EbayInsightsNoAccessError,
} from "../lib/ebay";
import { priceFromListings } from "../lib/ebay-match";

config({ path: ".env.local" });

const NAME = "1986 Fleer Michael Jordan";
const QUERY = "1986 Fleer Michael Jordan 57 rookie";
const GRADE = "raw";

const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

async function main() {
  console.log("eBay connectivity check");
  console.log("=======================");
  console.log(`Sample query: "${QUERY}"  (grade: ${GRADE})\n`);

  // 1. Keys
  if (!ebayConfigured()) {
    console.log("❌ Keys: EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not set in .env.local.");
    console.log("   Create a Production keyset at developer.ebay.com, add the two vars, then re-run.");
    process.exit(1);
  }
  console.log("✅ Keys: EBAY_CLIENT_ID / EBAY_CLIENT_SECRET present.");

  // 2. Asking prices — Browse API (base scope, available immediately)
  let askingOk = false;
  try {
    const listings = await searchEbayListings(QUERY);
    askingOk = true;
    console.log(`\n✅ Asking prices (Browse API): ${listings.length} active listings fetched.`);
    const priced = priceFromListings(listings, NAME, GRADE, 3);
    if (priced) console.log(`   Matched median (${GRADE}): ${usd(priced.medianCents)} from ${priced.count} comps.`);
    else console.log("   (Not enough matched comps for a median — connectivity is still OK.)");
    listings.slice(0, 3).forEach((l) => console.log(`   · ${usd(l.cents).padStart(8)}  ${l.title.slice(0, 68)}`));
  } catch (e) {
    console.log(`\n❌ Asking prices failed: ${(e as Error).message}`);
  }

  // 3. Sold comps — Marketplace Insights (restricted scope, requires approval)
  let soldOk = false;
  try {
    const sold = await searchEbaySoldItems(QUERY);
    soldOk = true;
    console.log(`\n✅ Sold comps (Marketplace Insights): APPROVED — ${sold.length} sold items (last ~90 days).`);
    const priced = priceFromListings(sold, NAME, GRADE, 2);
    if (priced) console.log(`   Matched median (${GRADE}): ${usd(priced.medianCents)} from ${priced.count} comps.`);
    sold.slice(0, 3).forEach((s) =>
      console.log(`   · ${usd(s.cents).padStart(8)}  ${s.soldDate?.slice(0, 10) ?? "????-??-??"}  ${s.title.slice(0, 56)}`)
    );
  } catch (e) {
    if (e instanceof EbayInsightsNoAccessError) {
      console.log("\n⏳ Sold comps (Marketplace Insights): NOT approved yet.");
      console.log("   Apply for the Marketplace Insights API (a restricted API) at developer.ebay.com using your");
      console.log("   Production keyset. Until then the app/cron falls back to asking prices automatically.");
    } else {
      console.log(`\n❌ Sold comps failed: ${(e as Error).message}`);
    }
  }

  console.log("\n-----------------------");
  console.log("Summary");
  console.log("  Keys configured : ✅");
  console.log(`  Asking prices   : ${askingOk ? "✅" : "❌"}`);
  console.log(`  Sold / Insights : ${soldOk ? "✅ approved" : "⏳ not approved (apply at developer.ebay.com)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
