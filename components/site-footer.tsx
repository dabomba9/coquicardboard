import Link from "next/link";
import { CoquiGlyph } from "@/components/coqui-glyph";
import { PrClock } from "@/components/pr-clock";

// Puerto Rico island silhouette — themed to currentColor so it follows the brand
// accent in both light and dark (instead of the source's fixed yellow).
function PuertoRicoMap({ className }: { className?: string }) {
  return (
    <svg width="80" height="30" viewBox="0 0 1110 416" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Puerto Rico">
      <path d="M715.3,402.3c-1.5,12.7,9.6,7.7,15,12.9s9.2,3.9,13.5.7c15.9-11.7,23.5-3.5,31.1-10.9,5.2-5.1,10.4-9.4,16.9-12.7,7,4.5,16.9,10.6,24.5,4.4l8.6-7c14.5,1.2,10-7.4,21.5.5,1.7,1.2,4.4,2.3,5.9,1.7,6.2-2.3,3.6-8.6,11.4-6.2,14.1,4.3,12,3.5,21.3.5s12.3,4.6,21.3-7.9c5.7-8,8.4-.2,14.8-3,1.3-.6,2.4-2.8,3.6-4.5,1.9-2.7,4.7-5,7.2-7.5s4.1-6.5,6.2-9.6,7.4-5.6,10-8.8c4.8-5.9,8.5-11.9,12.1-18.6,4,1.6,7.7,2.4,11.8.7,7-2.9,9.2-11.2,9.4-18.4,5.8-2.8,4.5-7.9,5.1-12.6,10.4-14.5.9-15,10.1-26l3.9-12.4c7.9-2.2,12.3-7.9,15.8-14.7,3.5-1.3,8-3.7,11.3-6,3.3,1.6,8.2,4.6,12,4.7,6.3.1,8.2-6.4,12.4-8.7,4.4-2.4,10-3.7,13.7-7.5,3.7,2.2,8,5.8,12.7,4.3,4.2-1.3,8.2-5.4,8.3-10l.2-7.2c0-.3,2.1-1.2,2.2-.9l3.8,8.3c1.9,4.1,6.6,4.3,9.8,1.8,15.4-12.3,2.4-35.4-10.2-45.5,1.1-2.8,2.4-7.2,1.6-9.8-.6-2-3.6-4.1-6-5.9l5.9-5.4c1.6-9.6-2.2-18.2-4.3-27.7,6-7.2,15.5-26,4.1-31.9-3.1-1.6-7.6-.5-10.1,2.4-3.8,4.5-10-4.7-18.4,7.6-4.7.3-9.9-1.4-14.1-3.5-8.9-4.3-5.5,1.4-17.7-5.4s-16.5-6-25.5-7.8-9.9-10.6-16.1-13.1c-7.7-3.1-15.9-4.9-24.1-4.8s-4.4,1.1-6-2.3c-1.2-2.7-3.9-7.2-7.2-8.1-8.6-2.3-24.6-3.5-34-2.9-10.7-7.5-10.7-18.2-25.8-11.1-3.7,1.8-11.9,1.8-15.6.3-7.4-3-23.5-11.6-29.3-1.4-8.3-1.7-10.8.7-20.6,4.7s-4.8,3-7.2,6.2c-3.9-7.4-10.5-9.1-18.3-9s-15.4-14-26.3-7.8c-6,3.4-4.3,11.3-.6,15.7.7.9-2,3.3-3.1,3.1-3-.5-3.1-11.4-20.2-8.1-10.4-12.8-16-8.2-22.7-10.7s-11.2-4.9-17.3-6.6-8.1.9-11.6.6-9.2-.8-13.9-.7c-12.1.3-12.1-8-22.4-10-6.4-1-9.8,8.1-19.1,6.3-18.4-3.5-25.8-11.5-40.8-6.9-9.8,3-24.7-8-34.4-6.9-12,1.4-21.9,8.3-29.7,17.5-7.3-.3-14-2.8-21.1-4.3-18.4-3.7-20.7-1.6-39.6-8.4-4.8-1.7-10.6-3.4-15.5-1.5l-10.4,3.9c-10.6-6.6-22.3-7.3-34.3-7.6-8.8-.2-15.8,2-23.7,4.5s-9.5.4-14.2,3.9l-9.5,7.1c-29.5,2.3-29.5-11-37.3-12.3-34.9-6.2-37.6,2.7-46.8,2.2-12.6-.7-18-11.9-45.9.1-17.1-1.7-26.4-5.7-44.9-7-5.6-.4-10.2-.5-15.1-3.6-21.8-13.9-24.9-5.5-39.1-8.5s-8.3-1.3-12.1-1.3c-11.8.3-23.3,2.2-34.5,4.8-19.8,4.7-19.9,19.8-27.4,24.8s-8.2,4.7-6.2,10l5,12.8c1.6,4.2,1.3,9.2,1.5,13.7s-6.8,11.3-11.1,12.4-8.2,7-12.2,9.2-12.4,1.9-17.9,6.3c-10.1,7.8-19.3,4.9-26.7,12.7-7.7,8,2.4,18.7,7.8,25.2,1.7,2,1.6,6.6,2.6,9.2,4.2,9.8,8.6,8.8,12.9,20.2,2.2,1.8,16.1,4,19.9,4.3s5.1,3.3,5.7,5.8l3.7,16.7c.7,3.3,3.6,5.7,6.9,7l.2,11.6c0,5.6,5,7.6,8.9,10.5,2.3,1.7.9,7.4-.9,9.3l-11.3,11.7c-4.6,4.8-1.2,11.7-.9,16.9-2.6,4.6-4.9,14.7-4.5,19.7s.4,10.6.5,16.4-2.2,4.9-4.4,6.7c-8.1,6.4.9,16.7,1.3,18.3-.3-.9-8.9,7.3-1.7,17.2,4.3,5.9,10.4,7.2,18,7.8-1.4,3.2-3,4.7-5.3,6.8l-2.3,6.7c-5.3-1.5-9.2,1-10.7,5.8l-8.7,4.7c-8.9,4.9-5,14.8-5.7,27.7s3.8,10.1,9.6,10.9c1.7,3.9,3.6,9.4,8.3,10.8s9.4-.5,11.4-3.9,1.1-8.3-1.5-12.5c.4-.8,2.9-2,4-1.7s2.2,1.5,2.9,2.5c3.2,4.5,8.6,2.5,13.4,2.5,12.6-.1,21.1,8.3,32.1,1.5,6.7,2.2,10.1-2.8,14.5-6.3,4.4-3.5,7.8-3.7,8-7.5s1.4-3.1,2.3-3.3,2.4.3,3.6.9c9.5,4.5,14.2-2.3,25.6,5.7,3.4,2.4,7.8,4.8,12,4.6,3.1-.1,4.2-4.4,5.9-7.1,1.3,15.5,10.2,6.7,12.6,15.8s4.9,6.3,9.1,7.9,9.4,3.1,14.6,3.7l12.2,1.3c1.7.2,4.7-2.2,5.3-3.7s-.3-4.4-1.2-6.7c-.4-1.5,2.7-4.4,4.4-4.9,14.7,3.2,14.2-5.2,25.3,1.3,4.2,2.5,6.9-5.8,13.8-3.8,16.8,4.8,19.8-1.5,25.6-5s6-3.2,8.8-5.4,7.6-4.2,10.1-7.1,3.8-8.3.9-12.5c1.3-1.4,3.9-3.2,5.6-4,1.1,5.1,2,9.3,5.6,12.3s8.4,3,11.5,0,5.7-2.3,9.4-1.9c3.6.4,6.5.4,8.3,3.9,3.6,6.9,9,3,14,6,9.1,5.6,19.3,5.1,28.2-.6,5-3.2,10.8-5.7,16.2-6.3-.9,4.7-.4,8.9,2.1,11.4s7.2,2.9,11,1.1c12.7-5.9,10.3,6.6,23.5.6l6.2-2.8c7.1,0,13.3-2.9,20-4.4l10.5-2.4c6-1.4,11.5-4.2,16.1-7.5,7.2,1.1,15.5,2.1,22.8,2.4,1.6,3.9,6,7,9.3,8.7,2.3,5.5,5.4,12.2,13.1,10.9s5.5-.6,7.8.7c6.2,3.6,12.1,8.4,19,10.1,5.4,1.4,10.1-5,9.9-10.5l10.6-3.4c8.7-2.8,8.1-12.3,17.1-8.7,3.9,7.1,10.7,11.5,19,9.3l.4,7.4c.2,4,5.9,7.4,9.4,6,1.8-.7,4.1-1.3,5.8-1.2,4.4,4.5,11,9.1,17.4,7.6,12.6-2.9,12.6.5,17.5-9l7.3-2.5,4.6-5.6,8.3,3.7h-.5Z" fill="currentColor" />
    </svg>
  );
}

const linkCls = "text-muted transition-colors hover:text-foreground";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="font-modern border-t border-border/50">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 md:pb-10">
        {/* Brand + links */}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <CoquiGlyph size={22} className="text-accent" aria-label="" />
              <span><span className="text-accent">Coqui</span> Cardboard</span>
            </Link>
            <p className="mt-2 text-sm text-muted">Collecting tools &amp; guides for the Michael Jordan card universe.</p>
            <div className="mt-4 flex items-center gap-3 text-xs text-muted">
              <PuertoRicoMap className="text-accent" />
              <span>Made in Puerto Rico 🇵🇷 · <PrClock /></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
            <div>
              <div className="font-sans text-[10px] uppercase tracking-wide text-muted">Catalogs</div>
              <ul className="mt-2 space-y-1.5">
                <li><Link href="/mj-hierarchy" className={linkCls}>MJ Hierarchy</Link></li>
                <li><Link href="/vault" className={linkCls}>Jordan Vault</Link></li>
                <li><Link href="/mamba-hierarchy" className={linkCls}>Mamba Hierarchy</Link></li>
                <li><Link href="/kobe-hierarchy" className={linkCls}>Mamba Origins</Link></li>
                <li><Link href="/kobe-vault" className={linkCls}>Kobe Vault</Link></li>
                <li><Link href="/clemente-vault" className={linkCls}>Clemente Vault</Link></li>
                <li><Link href="/killebrew-vault" className={linkCls}>Killebrew Vault</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-sans text-[10px] uppercase tracking-wide text-muted">Learn</div>
              <ul className="mt-2 space-y-1.5">
                <li><Link href="/guides" className={linkCls}>Guides</Link></li>
                <li><Link href="/login" className={linkCls}>Sign in</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="mt-8 border-t border-border/40 pt-6 text-[11px] leading-relaxed text-muted">
          <p>
            Independent, fan-made tool — not affiliated with the NBA, Michael Jordan, or any card manufacturer. Card
            values are estimates, not financial advice. As an eBay Partner Network member, we may earn from qualifying
            purchases. Trademarks &amp; card images belong to their respective owners. Checklist data for the MJ
            Hierarchy and Mamba Origins is credited to Bryan Denison /{" "}
            {/* underlined: an inline link inside the muted legal paragraph is otherwise invisible */}
            <a href="https://cajuncardboard.com/" target="_blank" rel="noreferrer" className={`${linkCls} underline underline-offset-2`}>Cajun Cardboard</a>.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {year} Coqui Cardboard.</span>
            <Link href="/terms" className={linkCls}>Terms</Link>
            <Link href="/privacy" className={linkCls}>Privacy</Link>
            <Link href="/guides" className={linkCls}>Guides</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
