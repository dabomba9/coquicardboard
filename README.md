# Coqui Cardboard

Collecting tools and guides for the Michael Jordan card universe — and, increasingly, the
people who belong next to him.

Seven catalogs across four players. Track what you own, log the grade and the copy count,
follow real market value, build a want list, and share a public profile. Free to browse;
signing in is what turns it into a collection.

**Live at [coquicardboard.com](https://www.coquicardboard.com).**

## The catalogs

A *hierarchy* is a curated, opinionated set — the cards that actually matter, ranked into
tiers. A *vault* is everything: the complete issue list, searchable.

| Catalog | What it is |
| --- | --- |
| **The MJ Hierarchy** | 378 definitive Jordan cards across 4 rarity tiers |
| **The Jordan Vault** | 12,000+ cards — every Michael Jordan issue |
| **The Mamba Hierarchy** | 76 definitive Kobe cards across 3 tiers: grails, elite, foundation |
| **Mamba Origins** | 143 Kobe 1996-97 rookie cards across 25 brands — the complete rookie class |
| **The Kobe Vault** | Kobe Bryant, 1996 to now |
| **The Clemente Vault** | Roberto Clemente, complete playing-era run |
| **The Killebrew Vault** | Harmon Killebrew, complete playing-era run |

Plus **Guides** — long-form writing on the sets, the print runs and the chase.

## What it does that a checklist does not

1. **Every copy, not every card.** Own the same card raw and in a PSA 9 and a BGS 8.5, and
   log all three, each with its own grade, purchase price and acquisition date.
2. **Real values.** Per-card prices by grade from eBay sales, and an estimated value for
   the collection as a whole.
3. **The objects, at size.** Card art rendered large enough to look at, because these are
   gorgeous things and most sites that index them hand you a spreadsheet.
4. **Public profiles and want lists.** A shareable `/u/<username>`, "for trade" flags, and a
   want list other collectors can read.
5. **Your data is yours.** Self-serve export and account deletion, not a support ticket.

## Stack

**Next.js 16** (App Router) and **Supabase** — Postgres, Auth, Storage, and row-level
security. TypeScript throughout, with the schema and RPC in PL/pgSQL.

## Running it

```bash
npm install
```

**Supabase, locally** (needs Docker):

```bash
npx supabase start     # prints the API URL and keys
npx supabase db reset  # applies supabase/migrations + RLS
```

**Or in the cloud:** create a project at supabase.com and run the migrations in
`supabase/migrations/` in order, starting with `0001_init.sql`.

Then copy `.env.local.example` to `.env.local` and fill in the URL and keys. For Google
sign-in, enable the Google provider in Supabase Auth and set the redirect URL to match your
local host.

```bash
npm run dev
```

## Data and rights

Independent and fan-made. Not affiliated with the NBA, Michael Jordan, or any card
manufacturer.

Checklist data for the MJ Hierarchy and Mamba Origins is credited to
**Bryan Denison / Cajun Cardboard**, whose work these catalogs build on.

Card values are estimates, not financial advice. Trademarks and card images belong to their
respective owners.

---

Made in San Juan, Puerto Rico 🇵🇷 by [Dustin Reed](https://www.dustinreed.co).
