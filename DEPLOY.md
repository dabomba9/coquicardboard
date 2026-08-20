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
   | `NEXT_PUBLIC_EBAY_CAMPID` | eBay Partner Network campaign id (affiliate; optional) |
   | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console HTML-tag token (optional) |
   | `NEXT_PUBLIC_GA_ID` | Google Analytics 4 id `G-XXXXXXXXXX` (optional; GA loads only when set) |
3. Deploy. The nightly price-refresh cron (`vercel.json` → `/api/cron/refresh-prices`, 08:00 UTC) is picked up automatically; Vercel sends `Authorization: Bearer $CRON_SECRET`.
   > Note: cron functions hit the plan timeout (Hobby ≈10s). Keep `PRICE_REFRESH_BATCH` small on Hobby, or upgrade to Pro (`maxDuration=60` is already set).

## 5. Domain (coquicardboard.com)
1. Vercel → Project → **Settings → Domains** → add `coquicardboard.com` (+ `www`).
2. At your registrar, set the records Vercel shows (apex `A 76.76.21.21` + `www` CNAME `cname.vercel-dns.com`), or switch to Vercel nameservers.
3. Wait for DNS + automatic SSL. Done — the site is live, with the MJ Hierarchy at `/mj-hierarchy`.

## Notes
- Market values are **real eBay** prices only (asking until Marketplace Insights/sold is approved); cards without a comp show "No recent sales yet."
- Card images are self-hosted in the `card-images` Storage bucket; provenance is in `image_source`.
- Jordan Vault (`/vault`) images are self-hosted in the `vault-images` Storage bucket (built from `NEXT_PUBLIC_SUPABASE_URL` at runtime); `public/vault/` is a local staging cache only and is not deployed.
- `npm run test:rls` can be pointed at the cloud project to re-verify the security boundary post-deploy.
