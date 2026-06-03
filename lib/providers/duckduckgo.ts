// DuckDuckGo image search — UNOFFICIAL endpoint, no API key. Brittle by nature:
// it can change or rate-limit without notice. Wrapped so failures return null.
import type { ImageResult } from "@/lib/image-search";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function getVqd(query: string): Promise<string | null> {
  const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images&iax=images`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) return null;
  const html = await res.text();
  // vqd appears in several shapes: vqd="4-123…", vqd='4-123…', vqd=4-123…&
  const m =
    html.match(/vqd=["']([^"']+)["']/) ??
    html.match(/vqd=([0-9-]+)&/) ??
    html.match(/"vqd":"([^"]+)"/);
  return m ? m[1] : null;
}

export async function searchDuckDuckGo(query: string): Promise<ImageResult> {
  try {
    const vqd = await getVqd(query);
    if (!vqd) return null;

    const url = `https://duckduckgo.com/i.js?${new URLSearchParams({
      l: "us-en",
      o: "json",
      q: query,
      vqd,
      f: ",,,",
      p: "1",
    })}`;

    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: "https://duckduckgo.com/", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: { image?: string; thumbnail?: string; title?: string }[];
    };
    for (const r of data.results ?? []) {
      const img = r.image ?? r.thumbnail;
      if (img && img.startsWith("https://")) return { imageUrl: img, title: r.title ?? "" };
    }
    return null;
  } catch {
    return null;
  }
}

// All https image results for a query (not just the first) — lets the caller
// try multiple candidates until one downloads.
export async function searchDuckDuckGoAll(query: string): Promise<NonNullable<ImageResult>[]> {
  try {
    const vqd = await getVqd(query);
    if (!vqd) return [];
    const url = `https://duckduckgo.com/i.js?${new URLSearchParams({
      l: "us-en", o: "json", q: query, vqd, f: ",,,", p: "1",
    })}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: "https://duckduckgo.com/", Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: { image?: string; thumbnail?: string; title?: string }[];
    };
    const out: NonNullable<ImageResult>[] = [];
    for (const r of data.results ?? []) {
      const img = r.image ?? r.thumbnail;
      if (img && img.startsWith("https://")) out.push({ imageUrl: img, title: r.title ?? "" });
    }
    return out;
  } catch {
    return [];
  }
}
