import type { NextConfig } from "next";

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
    return [{ source: "/hierarchy", destination: "/mj-hierarchy", permanent: true }];
  },
};

export default nextConfig;
