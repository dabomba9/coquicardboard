import type { Metadata } from "next";
import { Jersey_25, VT323 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteNav } from "@/components/site-nav";
import { CommandPalette } from "@/components/command-palette";
import { Toaster } from "sonner";
import type { Viewport } from "next";

// Display: "Jersey 25" — a pixelated varsity jersey-number face, kept for big
// page titles + the hero as brand identity. Body/UI text is a clean modern sans
// (set in globals.css) to match the navbar.
const pixelDisplay = Jersey_25({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});
// Data: monospace pixel digits for value/year/# columns and prices (brand accent).
const pixelData = VT323({
  weight: "400",
  variable: "--font-data",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Coqui Cardboard — collecting tools & guides",
    template: "%s · Coqui Cardboard",
  },
  description:
    "Coqui Cardboard: tools and guides for sports-card collectors. Track the Michael Jordan card hierarchy — grade your copies, follow market value, build a want list, and share your collection.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efe6cd" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1026" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${pixelDisplay.variable} ${pixelData.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Global posterize/illustration filter referenced by .card-illus on pixel cards. */}
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <filter id="cc-illus">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 0.33 0.67 1" />
              <feFuncG type="discrete" tableValues="0 0.33 0.67 1" />
              <feFuncB type="discrete" tableValues="0 0.33 0.67 1" />
            </feComponentTransfer>
          </filter>
        </svg>
        <Providers>
          <SiteNav />
          <CommandPalette />
          <main className="flex-1 pb-16 pt-[5.5rem] md:pb-0">{children}</main>
          <footer className="border-t-2 border-border py-6 text-center text-xs text-muted">
            <span className="font-data text-sm">©</span> Coqui Cardboard · an independent collector tool.
            MJ Hierarchy tier concept credited to Cajun Cardboard.
          </footer>
          <Toaster
            theme="system"
            position="bottom-right"
            closeButton
            toastOptions={{ className: "pixel-box !rounded-none font-sans" }}
          />
          {/* Global CRT / scanline overlay — sits above content, never blocks clicks. */}
          <div className="crt-overlay" aria-hidden="true" />
        </Providers>
      </body>
    </html>
  );
}
