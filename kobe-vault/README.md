# Kobe Vault — data sourcing (TCDB)

The Kobe Vault (`catalog='kobe-vault'`, route `/kobe-vault`) reuses the same app machinery as the Jordan Vault. The
only thing that differs is **where the card list comes from**: Jordan had jordan-vault.com's open JSON API; Kobe does
not — the complete source is **TCDB** (~10,341 cards), which is **HTML-only and behind Cloudflare**.

## Status
- **Phase 1 (done):** the vault is parameterized by catalog and `/kobe-vault` works, seeded from a small **curated
  sample** at `data/kobe-vault.json` (~50 real, iconic Kobe cards across 1996–2020 — facts only). This validates the
  page/filters end-to-end without TCDB.
- **Phase 2 (follow-up):** the full ~10k TCDB scrape → regenerate `data/kobe-vault.json` → re-seed.

## Why this needs a real browser (CDP)
TCDB serves a Cloudflare **managed challenge** that blocks plain `fetch()`/curl (even with a browser UA → HTTP 403).
`robots.txt` *does* permit `/Person.cfm` and `/Checklist.cfm`, so the content is allowed to be read — but only through
a session that has passed the challenge. Same situation `jordan-vault/fetch-images.ts` handles for TCDB images via
`--cdp` (attach to a normal Chrome you launched + solved by hand). Playwright (`^1.60.0`) is already a dependency.

Crawl **politely**, store only card **facts** (name / set / number / year — not copyrightable), and **do not**
download or redistribute TCDB images (the app's own image pipeline / placeholders fill art).

## Planned pipeline (Phase 2)
1. **Launch + solve once** (human):
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 --user-data-dir="$HOME/.cf-chrome" "https://www.tcdb.com/"
   # solve the Cloudflare check in that window
   ```
2. **`kobe-vault/scrape.ts` (to write against the live page):** Playwright `connectOverCDP("http://localhost:9222")`,
   then walk Kobe's player checklist `https://www.tcdb.com/Person.cfm/pid/6734/Kobe-Bryant` across its pagination
   (param finalized against the live DOM — likely `PageIndex`), parsing each card row → `{ year, setName, cardNumber,
   name, manufacturer, brand, cardType }`. Resumable `.cache/` of fetched page HTML; ~1s delay; re-solve if Cloudflare
   re-challenges (vault is ~100 text pages, not 10k image loads, so far fewer solves than the image run). **The row
   selectors must be finalized against 2–3 live pages first** — they can't be guessed blind (the page is Cloudflare-
   walled from here).
3. **`kobe-vault/build-app-data.ts`:** normalize → `data/kobe-vault.json` in the shape `admin/seed-vault.ts` reads
   (`id, slug, name, year, manufacturer, brand, cardNumber, cardType, tier:null, page:null, row:null, hasFront:false,
   hasBack:false, psaPopReport:null`).

## Seed (either phase)
```bash
npm run seed:vault:kobe     # tsx admin/seed-vault.ts kobe-vault data/kobe-vault.json kv
```
Slugs are prefixed `kv` so they never collide with the Jordan vault (`v`) or the hierarchies.
