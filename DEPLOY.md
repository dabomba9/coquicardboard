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
npm run seed             # 378-card catalog + tiers + sets + sample prices
npm run prices:ebay      # eBay asking prices (needs EBAY_CLIENT_ID/SECRET)
npm run prices:fill      # estimated values for any card/grade still unpriced (never overwrites real prices)
npm run prices:sold      # eBay SOLD comps — needs Marketplace Insights access (see below); overwrites asking/estimated
```
**Price source precedence:** `ebay (sold)` > `ebay (asking)` > `estimated`. Sold comps require eBay's
**Marketplace Insights API** — apply on your Production keyset at developer.ebay.com. Until approved,
`prices:sold` exits cleanly without writing. The nightly cron prefers sold → asking automatically.
Images — choose one:
- **Preserve current images (recommended):** keep your *local* Supabase running and run
  ```bash
  CLOUD_SUPABASE_URL=… CLOUD_SERVICE_ROLE_KEY=… npx tsx admin/migrate-images-to-cloud.ts
  ```
  (copies the vision-verified images from local Storage → cloud, matched by slug).
- **Or re-fetch fresh on cloud:** `npm run fetch:images` (simpler; re-picks images).

### Jordan Vault (the 12k-card `/vault` section)
The 12,114 vault cards live in the shared `cards` table (`catalog='mj-vault'`, added by migration `0006`); their
images live in the **`vault-images`** Storage bucket (migration `0005`) — **not** in the repo (`public/vault/` is
git-ignored). With the same temporary cloud-pointing `.env.local` as above:
```bash
npx tsx admin/seed-vault.ts               # loads data/vault.json → cards (catalog='mj-vault'); image links left null
npx tsx jordan-vault/upload-images.ts     # uploads public/vault/*.jpg → vault-images (idempotent/resumable)
npx tsx admin/reconcile-vault-images.ts   # points image_url/backImage only at images that exist in the bucket
```
Run `reconcile-vault-images.ts` after every upload batch — it's what populates the image links (the seed leaves them
null so no card ever points at a missing 404 image). Cards without an uploaded image fall back to a placeholder, so a
partial image set is fine. (Locally,
`jordan-vault/auto-resume.sh` downloads + uploads automatically against whatever `.env.local` points at.)

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
- Market values are **estimated** + **eBay asking** (not sold comps) — labeled in-app.
- Card images are self-hosted in the `card-images` Storage bucket; provenance is in `image_source`.
- Jordan Vault (`/vault`) images are self-hosted in the `vault-images` Storage bucket (built from `NEXT_PUBLIC_SUPABASE_URL` at runtime); `public/vault/` is a local staging cache only and is not deployed.
- `npm run test:rls` can be pointed at the cloud project to re-verify the security boundary post-deploy.
