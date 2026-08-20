# MJ Hierarchy — Michael Jordan Card Collection Tracker

An improved, open take on Cajun Cardboard's MJ Hierarchy: track all ~378 Michael
Jordan cards across the four-tier hierarchy, log **every copy** with its grade and
condition, follow market value, build a want list, and share a public profile.

Built with **Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage, RLS)**.

## What makes it better than a checklist

1. **Rich card data** — set, year, print run, pack odds, and styled card art (real
   images come via user uploads / licensed sources later — see _Data & rights_).
2. **Market value** — per-card prices by grade and an estimated collection value.
3. **Condition / grade tracking** — raw vs graded (PSA/BGS/SGC), grade, quantity,
   purchase price, and acquisition date. Own a card in multiple grades at once.
4. **Public sharing + want list** — a shareable `/u/<username>` profile, "for trade"
   flags, and a personal want list.

## Setup

### 1. Install deps
```bash
npm install
```

### 2. Bring up Supabase

**Option A — local (needs Docker running):**
```bash
npx supabase start          # prints API URL + anon/service_role keys
npx supabase db reset       # applies migrations in supabase/migrations + RLS
```

**Option B — cloud:** create a project at supabase.com, then in the SQL editor run
`supabase/migrations/0001_init.sql` then `0002_rls_and_rpc.sql` (in order).

### 3. Environment
Copy `.env.local.example` → `.env.local` and fill in the URL + keys from step 2.
For Google OAuth, also enable the Google provider in Supabase Auth and set the
redirect URL to `http://localhost:3000/callback`.

### 4. Seed the catalog
```bash
npm run seed     # idempotent; upserts tiers, sets, the card catalog
```
Re-running is safe: existing `image_url`/`image_source` are carried forward, not cleared, and the
seed writes no prices (those come from the eBay scripts only).

### 5. Run
```bash
npm run dev      # http://localhost:3000
```

## Project layout

- `supabase/migrations/` — schema (`0001`) and RLS + trigger + RPC (`0002`).
- `data/catalog.ts` — the card dataset (real curated cards + labeled filler to 378).
- `admin/seed-catalog.ts` — service-role seed script (`npm run seed`).
- `lib/supabase/{client,server,middleware}.ts` — `@supabase/ssr` clients.
- `lib/queries.ts` / `lib/actions/*` — server reads / Server Actions (RLS-scoped).
- `app/` — landing, `hierarchy`, `cards/[slug]`, gated `(app)/{collection,want-list,settings}`, public `u/[username]`.

## Card images (auto-fetch + self-host)

Cards ship with no images (styled placeholders). Auto-fetch finds a photo per card,
**downloads it, and stores it in our own Supabase Storage** (`card-images` bucket);
`cards.image_url` then points at our public URL — so images don't break when a source
listing ends. Provider is set by `IMAGE_SEARCH_PROVIDER`:

- **`duckduckgo`** (default) — no keys, works immediately. Unofficial endpoint, so
  it can rate-limit/change; image quality varies.
- **`ebay`** — eBay's official Browse API. Set `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`
  (Production App ID + Cert ID from [developer.ebay.com](https://developer.ebay.com)).

Bulk-fill:
```bash
npm run fetch:images            # cards missing an image
npm run fetch:images -- --force # refetch all — skips vision/manually-verified picks
npm run fetch:images -- --force --include-verified # ...and overwrite those too (destructive)
npm run fetch:images -- --limit 20
```
`--force` re-picks images from a search guess, so it would otherwise undo the vision-audit work
(`image_source` "verified (vision)" / "verified (manual)"); those rows are skipped and counted unless
you opt in with `--include-verified`.
Or use **Admin → Image Manager** (`/admin/images`): per-card **Fetch image**, or
**Auto-fetch missing (visible)** for the filtered set. Bad matches are fixable by
pasting a URL (the paste path stores the URL directly).

Caveat: auto-fetched images are arbitrary web results — we now *rehost* them, so
`image_source` records provenance for removal. The UI falls back to the placeholder
if an image fails to load.

## Testing

```bash
npm test          # vitest unit suite — value math, grade keys, CSV parsing, query builders
npm run test:rls  # RLS/security integration test against LOCAL Supabase (creates+deletes test users)
npm run lint && npx tsc --noEmit
```

`test:rls` asserts the security boundary: catalog is world-readable but write-locked,
per-user holdings are isolated, and `get_public_collection` only exposes public
profiles. CI (`.github/workflows/ci.yml`) runs lint + typecheck + unit tests on push/PR
(the RLS test needs a live DB, so it stays local).

## Market values (real eBay only)

Per-card prices (`card_prices`, by grade) and history (`price_history`) power the
card-detail value + chart and the collection's value-over-time / gain-loss. **Prices
are real eBay data only** — sold comps where available, otherwise asking prices — and
nothing is shown for a card until a real comp exists ("No recent sales yet"). There are
no estimated/placeholder values. Pull them with:

```bash
npm run prices:ebay         # eBay asking prices
npm run prices:sold         # eBay SOLD comps (needs Marketplace Insights access)
npm run prices:purge-fake   # safety net: delete any non-eBay rows
```

The nightly cron (`/api/cron/refresh-prices`) keeps them fresh. Real signal also comes
from **your own purchase prices** (cost basis) entered per holding.

**eBay asking prices** (if you have eBay API keys): set `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`, then:
```bash
npm run prices:ebay              # all cards (raw + PSA 10/9, BGS 9.5 for top tiers)
npm run prices:ebay -- --limit 10
npm run prices:ebay -- --tier 1
```
This writes median **active-listing (asking)** prices into `card_prices` (`source='ebay (asking)'`)
plus a fresh `price_history` point. Asking ≠ sold comps, so treat it as a live ceiling, not a
settled value — it coexists with the estimated history.

**eBay SOLD comps** (real settled prices — the most accurate source): these come from eBay's
**Marketplace Insights API**, which is access-gated — apply for it at developer.ebay.com on your
Production keyset. Once approved, the same keys work (the app requests the
`buy.marketplace.insights` scope at runtime):
```bash
npm run prices:sold              # all cards
npm run prices:sold -- --limit 10
npm run prices:sold -- --tier 1
```
This writes median **sold** prices (`source='ebay (sold)'`) + a `price_history` point
(`source='ebay-sold'`). Sold takes precedence over asking and estimated (one row per card+grade).
Until access is granted the script exits cleanly with an "apply for access" message and writes
nothing. The nightly cron ([app/api/cron/refresh-prices](app/api/cron/refresh-prices/route.ts))
automatically prefers sold → asking → keeps estimates.

## Data & rights (read before scaling)

- **Card list & tiers**: the catalog is the real **378-card MJ Hierarchy checklist**
  (4 tiers: 27 / 54 / 81 / 216), imported from `data/mj-hierarchy-checklist-2026-06-01.csv`
  — exported from Cajun Cardboard's tracker and **credited to Bryan Denison / Cajun
  Cardboard Creations**. `data/checklist.ts` parses it (deriving year, card number,
  set, serial/print run, pack odds, and type flags); `npm run seed` loads it. To use a
  different list, drop in a new CSV (same columns: Collected, Card Name, Tier, Type,
  Serial, Odds) and reseed. (`data/catalog.ts` retains the tier definitions + slug helpers.)
- **Images:** each card has an optional external `image_url` (+ `image_source` for
  attribution). When set, it renders in the grid/detail; when absent or if the URL
  fails to load, a styled placeholder shows. Add URLs in `data/catalog.ts` (then
  `npm run seed`) or directly in Supabase Studio. No copyrighted scans are bundled;
  populate only rights-cleared URLs. (User uploads / licensed images are a later step.)
- **Market values:** there is no supported, scalable, legal API for eBay sold comps,
  and scraping violates ToS. Values are seeded manually (grails first) and will be
  augmented by user-reported purchase prices; a paid/licensed feed is a later option.
  Treat all values as best-effort.

## Security model

The catalog is world-readable but write-locked (seed scripts use the service-role
key, which bypasses RLS). Per-user `holdings`/`want_list`/`profiles` are private via
RLS (`user_id = auth.uid()`). Public collections are exposed **only** through the
`get_public_collection` SECURITY DEFINER RPC, which hand-filters to public profiles
and public holdings — no broad public-read policies.
