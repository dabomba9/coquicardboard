# Deploying Coqui Cardboard to coquicardboard.com

Stack: **Next.js on Vercel** + **Supabase Cloud** (Postgres / Auth / Storage).
The codebase is production-ready; this runbook covers the account/DNS steps.

---

## 1. Supabase Cloud project
1. Create a project at https://supabase.com → **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`
2. Apply the schema (from this repo):
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push          # applies supabase/migrations/0001–0006 (tables, RLS, RPC, card + vault image buckets, vault catalog)
   ```

## 2. Seed the cloud data
Point a local shell at the cloud project (e.g. a temporary `.env.local` with the cloud URL + keys), then:
```bash
npm run seed             # 378-card catalog + tiers + sets
npm run prices:ebay      # eBay asking prices (needs EBAY_CLIENT_ID/SECRET)
npm run prices:sold      # eBay SOLD comps — needs Marketplace Insights access (see below)
npm run prices:purge-fake # safety net: removes any non-eBay (fabricated) price rows
```
**Pricing is REAL eBay data only** — no estimated/placeholder values. The app surfaces a price only when it has an
`ebay (sold)`/`ebay (asking)` row; otherwise it shows "No recent sales yet." Source precedence: `ebay (sold)` >
`ebay (asking)`. Sold comps require eBay's **Marketplace Insights API**, which as of Aug 2026 is a Limited Release
that eBay's docs describe as restricted and *not open to new users* — it is granted to major partners, and this app is
not approved (`npm run ebay:check` reports the current status). So `prices:sold` is a no-op today and everything
surfaces as `ebay (asking)`; the code works the moment access is ever granted. The nightly cron grows coverage
automatically (raise `PRICE_REFRESH_BATCH` on Vercel Pro).
Images — choose one:
- **Preserve current images (recommended):** keep your *local* Supabase running and run
  ```bash
  CLOUD_SUPABASE_URL=… CLOUD_SERVICE_ROLE_KEY=… npx tsx admin/migrate-images-to-cloud.ts
  ```
  (copies the vision-verified images from local Storage → cloud, matched by slug).
- **Or re-fetch fresh on cloud:** `npm run fetch:images` (simpler; re-picks images).

Re-running a seed is safe for images: `seed-catalog.ts` / `seed-vault.ts` carry existing
`image_url`/`image_source` (and `backImage`) forward rather than nulling them, and report how many
they kept. `fetch:images --force` likewise skips vision/manually-verified picks unless you pass
`--include-verified`.

### Jordan Vault (the 12k-card `/vault` section)
The 12,114 vault cards live in the shared `cards` table (`catalog='mj-vault'`, added by migration `0006`).

> **Local and cloud store vault images differently — this trips people up.**
> **Local:** `vault-images` bucket, keyed by tcdb id — `vault-images/{vault_id}-front.jpg`.
> **Cloud:** `card-images` bucket, keyed by card UUID — `card-images/{card_uuid}.jpg`, put there by
> `migrate-images-to-cloud.ts`. The cloud `vault-images` bucket is **empty**.
> So `reconcile-vault-images.ts` is a **local-only** tool: it rebuilds `image_url` from the
> `vault-images` bucket, and against cloud it would find nothing and clear every vault link. It now
> refuses to do that (see `admin/safety.ts`), but don't reach for it on cloud — use
> `migrate-images-to-cloud.ts`.

Work locally (`public/vault/` is git-ignored, so the jpgs are not in the repo):
```bash
npx tsx admin/seed-vault.ts               # data/vault.json → cards (catalog='mj-vault')
npx tsx jordan-vault/upload-images.ts     # public/vault/*.jpg → vault-images (idempotent/resumable)
npx tsx admin/reconcile-vault-images.ts   # LOCAL: links image_url/backImage to what's in the bucket
```
Run `reconcile-vault-images.ts` after every upload batch — it's what populates the image links (a first
seed leaves them null so no card points at a missing 404 image). Cards without an uploaded image fall
back to a placeholder, so a partial image set is fine. (`jordan-vault/auto-resume.sh` downloads +
uploads automatically against whatever `.env.local` points at.)

Then publish to cloud with the `migrate-images-to-cloud.ts` step above — optionally scoped, e.g.
`MIGRATE_CATALOGS=mj-vault`.

## 3. Auth (Supabase → Authentication)
- **URL Configuration:** Site URL `https://coquicardboard.com`; add redirect `https://coquicardboard.com/callback` (and your Vercel preview URL if used).
- **Email (magic link):** works out of the box on cloud (real emails).
- **Google (optional):** create an OAuth client in Google Cloud Console; authorized redirect URI = the Supabase callback shown in the provider panel; paste client id/secret into Supabase → Auth → Providers → Google.

## 4. Vercel
1. Import the repo at https://vercel.com.
2. **Environment Variables** (Production):
   | var | value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | cloud project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cloud anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | cloud service_role |
   | `NEXT_PUBLIC_SITE_URL` | `https://coquicardboard.com` |
   | `ADMIN_EMAILS` | `dr33d9@gmail.com` |
   | `IMAGE_SEARCH_PROVIDER` | `ebay` (or `duckduckgo`) |
   | `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | your eBay prod keys |
   | `CRON_SECRET` | a long random string |
   | `PRICE_REFRESH_BATCH` | `10` (raise on Pro) |
   | `NEXT_PUBLIC_EBAY_CAMPID` | eBay Partner Network campaign id — links work without it but earn nothing; see §7 |
   | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console HTML-tag token (optional) |
   | `NEXT_PUBLIC_GA_ID` | Google Analytics 4 id `G-XXXXXXXXXX` (optional; GA loads only when set) |
3. Deploy. The nightly price-refresh cron (`vercel.json` → `/api/cron/refresh-prices`, 08:00 UTC) is picked up automatically; Vercel sends `Authorization: Bearer $CRON_SECRET`.
   > Note: cron functions hit the plan timeout (Hobby ≈10s). Keep `PRICE_REFRESH_BATCH` small on Hobby, or upgrade to Pro (`maxDuration=60` is already set).

## 5. Domain (coquicardboard.com)
1. Vercel → Project → **Settings → Domains** → add `coquicardboard.com` (+ `www`).
2. At your registrar, set the records Vercel shows (apex `A 76.76.21.21` + `www` CNAME `cname.vercel-dns.com`), or switch to Vercel nameservers.
3. Wait for DNS + automatic SSL. Done — the site is live, with the MJ Hierarchy at `/mj-hierarchy`.

**The apex is canonical.** `www` exists only as a redirect source: `next.config.ts` 308s
`www.<host>` → apex for every path, derived from `NEXT_PUBLIC_SITE_URL`. Before that rule both
hostnames served 200 with identical content, so search engines crawled the site twice. Nothing else
should ever link to `www`.

## 6. Google Search Console
**Verification is already done, via a DNS TXT record — not the meta tag.** `dig +short
coquicardboard.com TXT` shows a `google-site-verification=…` entry. That's the **Domain property**
method, which covers the apex, `www`, every subdomain, and both http and https. Don't look for a
`<meta name="google-site-verification">` in the HTML and conclude verification is broken; there
isn't one and there doesn't need to be.

1. Confirm at [search.google.com/search-console](https://search.google.com/search-console) — a
   **Domain** property for `coquicardboard.com`. If it's missing, re-add it with the DNS TXT method;
   the record is already in place at the registrar, so it verifies immediately.
2. **Submit the sitemap.** Under **Sitemaps**, enter `sitemap.xml`. This is a separate step from
   verification — verifying proves ownership, it does not tell Google where the sitemap is.
   `robots.txt` advertises it as a passive hint, but submission is what produces the coverage report.
3. What to watch afterwards:
   - **Sitemaps** should report roughly **6,000** discovered URLs, not ~25,000. The sitemap only
     lists cards with an image or a real price (`getIndexableCardSlugs` in `lib/queries.ts`); the
     other ~19,000 render a name over a placeholder and carry `robots: noindex, follow`.
   - **Pages** → "Crawled – currently not indexed" should fall as those thin URLs leave the index.

`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` is an optional *second* method (an HTML-tag property), wired
in `app/layout.tsx` via `metadata.verification.google`. It's unset and that's fine while the DNS
record stands. If you ever do set it: **`NEXT_PUBLIC_*` values are inlined at build time, so setting
it in Vercel does nothing until you redeploy.** That's the trap most likely to cost you an hour.

## 7. Affiliate revenue (eBay Partner Network)

Outbound "find this card" links carry EPN tracking **only when a campaign id is set**. Without one
they still work — they're plain eBay searches — and earn nothing. Nothing breaks if you never set it;
it is simply the switch between the site making $0 and making something.

1. **Get the campaign id.** [partnernetwork.ebay.com](https://partnernetwork.ebay.com) → **Campaigns**
   tab → the **Number** column is the 10-digit campaign id. No campaigns listed? **Campaigns → Create
   new Campaign** first.
2. **Set it.** Vercel → Project → **Settings → Environment Variables** → add
   `NEXT_PUBLIC_EBAY_CAMPID` = that number, scoped to Production.
3. **Redeploy.** ⚠️ **`NEXT_PUBLIC_*` is inlined at build time, so saving the variable changes
   nothing until a new build runs.** Deployments → newest → ⋯ → **Redeploy** (untick "use existing
   build cache"). Skipping this is the single most likely way to conclude, wrongly, that the
   integration is broken.

`NEXT_PUBLIC_EBAY_MKRID` is optional — `lib/affiliate.ts` defaults it to the US rotation id
`711-53200-19255-0`. Only set it for a non-US marketplace.

**Confirming it took.** Open any card page, copy the "eBay" link and look for `campid=`. A second
signal is in the markup: `outboundRel` (`lib/affiliate.ts`) flips from `rel="noreferrer"` to
`rel="sponsored noopener noreferrer"` the moment a campaign id exists, so `rel` tells you whether the
*build* picked the value up.

**Where the links are**, so you know the surface being monetised — card pages, the want list, and
vault tiles. Each reports a distinct `customid` suffix so EPN can tell placements apart rather than
lumping them under the bare card slug:

| Surface | `customid` |
|---|---|
| Card page → "Find this card: eBay" | `<slug>:find` |
| Card page → "Recent sales: eBay sold" | `<slug>:sold` |
| Want list → "Find on eBay" | `<slug>:want` |
| Vault tile → "eBay ↗" | `<slug>:vault` |

> The footer states "As an eBay Partner Network member, we may earn from qualifying purchases" —
> which is written today while no link is tagged. If your EPN application is still pending, that
> sentence is inaccurate until approval; soften it or hold off publishing that claim.

## Notes
- Market values are **real eBay** prices only (asking until Marketplace Insights/sold is approved); cards without a comp show "No recent sales yet."
- Card images are self-hosted in the `card-images` Storage bucket; provenance is in `image_source`.
- Jordan Vault (`/vault`) images are self-hosted in the `vault-images` Storage bucket (built from `NEXT_PUBLIC_SUPABASE_URL` at runtime); `public/vault/` is a local staging cache only and is not deployed.
- `npm run test:rls` can be pointed at the cloud project to re-verify the security boundary post-deploy.
