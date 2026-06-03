import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteNav } from "@/components/site-nav";
import { CommandPalette } from "@/components/command-palette";
import { Toaster } from "sonner";
import type { Viewport } from "next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c10" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <SiteNav />
          <CommandPalette />
          <main className="flex-1 pb-16 sm:pb-0">{children}</main>
          <footer className="border-t border-border py-6 text-center text-xs text-muted">
            © Coqui Cardboard · an independent collector tool. MJ Hierarchy tier concept credited to Cajun Cardboard.
          </footer>
          <Toaster theme="system" position="bottom-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
