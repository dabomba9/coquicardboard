import type { NextConfig } from "next";

type Redirects = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>;

const nextConfig: NextConfig = {
  images: {
    // Card images are self-hosted in Supabase Storage (and historically arbitrary
    // external URLs). CardThumb renders with `unoptimized`, but allow both hosts.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "127.0.0.1" }, // local Supabase Storage
    ],
  },
  async redirects() {
    const redirects: Redirects = [{ source: "/hierarchy", destination: "/mj-hierarchy", permanent: true }];

    // www → apex. Both hostnames served 200 with identical content, so search
    // engines crawled the site twice; canonicals pointed at the apex but a
    // redirect is the unambiguous signal. Derived from NEXT_PUBLIC_SITE_URL rather
    // than hardcoded so local dev and *.vercel.app previews never match, and so a
    // missing env var disables the rule instead of redirecting to a wrong domain.
    // The `/` before each `:path*` is required — without it the path is treated as
    // a literal string and the rule can loop (see the redirects docs).
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site) {
      const apex = new URL(site).host.replace(/^www\./, "");
      redirects.push({
        source: "/:path*",
        // No loop: after the redirect the host is the apex, so this stops matching.
        has: [{ type: "host", value: `www.${apex}` }],
        destination: `https://${apex}/:path*`,
        permanent: true,
      });
    }
    return redirects;
  },
};

export default nextConfig;
