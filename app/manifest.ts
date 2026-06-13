import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coqui Cardboard — collecting tools & guides",
    short_name: "Coqui Cardboard",
    description: "Sports-card collecting tools & guides, including the Michael Jordan card hierarchy tracker.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c1026",
    theme_color: "#0c1026",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
