# Jordan Vault scraper

A **standalone** scraper that pulls the full Michael Jordan card catalog from
[jordan-vault.com](https://www.jordan-vault.com/cards) into a local dataset.

> **Independent of the Coqui Cardboard app.** This folder shares nothing with the
> app: no Supabase, no database writes, no imports from `@/`, and the 378-card MJ
> Hierarchy is untouched. It only reads a public JSON API and writes files here.

## How it works

`robots.txt` allows `/cards`, and the site is a Vite SPA backed by a public JSON
API — so no HTML parsing or headless browser is needed:

- **Enumerate** — `GET /api/cards?page=N&limit=250` (paginated; ~12,114 cards).
- **Detail** — `GET /api/cards/{id}` for each card's full fields (images,
  `hierarchy`, PSA pop link, eBay-sold flag — the list view nulls these out).
- **Enrich** — `/sitemap.xml` provides each card's canonical URL + slug.

Responses are cached under `.cache/` (git-ignored), so re-runs are fast and the
job is resumable. Requests run at concurrency 5 with a small delay, a descriptive
User-Agent, and retry-with-backoff on 429/5xx.

## Run

```bash
npx tsx jordan-vault/scrape.ts              # full catalog (~12k cards)
npx tsx jordan-vault/scrape.ts --limit 5    # first 5 ids (smoke test)
npx tsx jordan-vault/scrape.ts --no-cache   # bypass the on-disk cache
```

`tsx` is already available in this repo's dev dependencies.

## Output

- `data/cards.json` — array of normalized `CardRecord` (see `types.ts`).
- `data/cards.csv` — the same data, flat, one row per card.

Each record carries: id, indexNumber, sourceUrl, slug, name, year, manufacturer,
brand, cardNumber, cardType, hierarchy (+ parsed `tier`/`page`/`row`), front/back
image URLs, image flags, playerOdds, psaPopReport, and ebaySoldListings.

## Viewer

`index.html` is a standalone, zero-build browser tool for exploring the dataset
(search, filter by manufacturer / card type / year, "has image" and "hierarchy
only" toggles, sort, pagination). It's independent of the Coqui Cardboard app.

It must be **served over http** (it fetches `data/cards.json`, which `file://`
blocks):

```bash
npx serve jordan-vault                 # then open the printed URL
# or:
(cd jordan-vault && python3 -m http.server 8080)   # → http://localhost:8080
```
