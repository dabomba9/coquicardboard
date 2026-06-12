# Custom display font

Drop the brand **display** font file here (the one that replaces Press Start 2P as
`--font-display` for all headings, the logo wordmark, hero, tier labels, etc.).

- Preferred format: **`.woff2`** (smallest/fastest). `.ttf`, `.otf`, `.woff` also work.
- If you have multiple weights, drop them all (e.g. `MyFont-Regular.woff2`,
  `MyFont-Bold.woff2`) and note which is which.

It gets wired in `app/layout.tsx` via `next/font/local` →
`localFont({ src: "./fonts/<file>", variable: "--font-display", ... })`.
