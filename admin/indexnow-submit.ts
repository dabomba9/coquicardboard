/**
 * Submit every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam, Naver —
 * not Google, which doesn't use it). One POST takes up to 10,000 URLs.
 *
 * The key file public/bb67cfb31d24b1246f5dadb2f7e2c3d9.txt proves we own the host;
 * it must be deployed before this runs.
 *
 *   npx tsx admin/indexnow-submit.ts                 # https://coquicardboard.com
 *   npx tsx admin/indexnow-submit.ts --dry-run       # count URLs, send nothing
 *
 * Run after a deploy that changes many pages. Google's equivalent is resubmitting
 * the sitemap in Search Console (lastmod tells it what changed).
 */
const HOST = "coquicardboard.com";
const KEY = "bb67cfb31d24b1246f5dadb2f7e2c3d9";
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  console.log(`sitemap: ${urls.length} URLs`);
  if (dryRun || urls.length === 0) return;

  const key = await fetch(`https://${HOST}/${KEY}.txt`);
  if (!key.ok || (await key.text()).trim() !== KEY) {
    console.error(`Key file https://${HOST}/${KEY}.txt isn't live yet — deploy first.`);
    process.exit(1);
  }

  for (let i = 0; i < urls.length; i += 10_000) {
    const batch = urls.slice(i, i + 10_000);
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: batch }),
    });
    // 200/202 = accepted. 403 = key not verified, 422 = URLs don't match host, 429 = slow down.
    console.log(`  batch ${i / 10_000 + 1}: ${batch.length} URLs → HTTP ${res.status} ${res.statusText}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
