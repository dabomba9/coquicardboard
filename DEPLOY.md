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
   npx supabase db push          # applies supabase/migrations/0001–0004 (tables, RLS, RPC, storage bucket)
   ```

## 2. Seed the cloud data
Point a local shell at the cloud project (e.g. a temporary `.env.local` with the cloud URL + keys), then:
```bash
npm run seed             # 378-card catalog + tiers + sets + sample prices
npm run prices:ebay      # eBay asking prices (needs EBAY_CLIENT_ID/SECRET)
```
Images — choose one:
- **Preserve current images (recommended):** keep your *local* Supabase running and run
  ```bash
  CLOUD_SUPABASE_URL=… CLOUD_SERVICE_ROLE_KEY=… npx tsx admin/migrate-images-to-cloud.ts
  ```
  (copies the vision-verified images from local Storage → cloud, matched by slug).
- **Or re-fetch fresh on cloud:** `npm run fetch:images` (simpler; re-picks images).

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
3. Deploy. The nightly price-refresh cron (`vercel.json` → `/api/cron/refresh-prices`, 08:00 UTC) is picked up automatically; Vercel sends `Authorization: Bearer $CRON_SECRET`.
   > Note: cron functions hit the plan timeout (Hobby ≈10s). Keep `PRICE_REFRESH_BATCH` small on Hobby, or upgrade to Pro (`maxDuration=60` is already set).

## 5. Domain (coquicardboard.com)
1. Vercel → Project → **Settings → Domains** → add `coquicardboard.com` (+ `www`).
2. At your registrar, set the records Vercel shows (apex `A 76.76.21.21` + `www` CNAME `cname.vercel-dns.com`), or switch to Vercel nameservers.
3. Wait for DNS + automatic SSL. Done — the site is live, with the MJ Hierarchy at `/mj-hierarchy`.

## Notes
- Market values are **estimated** + **eBay asking** (not sold comps) — labeled in-app.
- Card images are self-hosted in the `card-images` Storage bucket; provenance is in `image_source`.
- `npm run test:rls` can be pointed at the cloud project to re-verify the security boundary post-deploy.
