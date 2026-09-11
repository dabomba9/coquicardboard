import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coqui Cardboard — collecting tools & guides",
    short_name: "Coqui Cardboard",
    description: "Sports-card collecting tools & guides: complete vaults and hierarchies for four legends, 24,000+ cards catalogued.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1712",
    theme_color: "#0b1712",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
