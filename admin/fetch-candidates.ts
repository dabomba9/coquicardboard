/**
 * Vision-verification helper: for each flagged card, fetch fresh candidate images
 * from BOTH providers (DuckDuckGo + eBay), download them locally, and write a
 * per-card meta.json the auditor reads to pick the one that matches exactly.
 *
 *   npx tsx admin/fetch-candidates.ts --slugs /tmp/kobe-verify/flagged.txt \
 *     --manifest /tmp/kobe-verify/manifest.json --out /tmp/kobe-verify/cand [--n 6]
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildQuery } from "../lib/image-search";
import { searchDuckDuckGoAll } from "../lib/providers/duckduckgo";
import { searchEbayAll } from "../lib/ebay";

config({ path: ".env.local" });

const arg = (f: string, d?: string) => { const i = process.argv.indexOf(f); return i !== -1 ? process.argv[i + 1] : d; };
const slugsFile = arg("--slugs", "/tmp/kobe-verify/flagged.txt")!;
const manifestFile = arg("--manifest", "/tmp/kobe-verify/manifest.json")!;
const outDir = arg("--out", "/tmp/kobe-verify/cand")!;
const N = parseInt(arg("--n", "6")!, 10);

const extFromType = (ct: string) => ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("gif") ? "gif" : "jpg";
const BACK_RE = /\b(back|reverse|rev\.?)\b/i;

async function dl(url: string, dest: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 1000) return null;
    const full = `${dest}.${extFromType(ct)}`;
    writeFileSync(full, buf);
    return full;
  } catch { return null; }
}

async function main() {
  const slugs = readFileSync(slugsFile, "utf8").trim().split("\n").filter(Boolean);
  const manifest: Record<string, { id: string; slug: string; name: string; brand: string; baseNumber: string; type: string }> =
    Object.fromEntries((JSON.parse(readFileSync(manifestFile, "utf8")) as Record<string, string>[]).map((c) => [c.slug as string, c as never]));
  mkdirSync(outDir, { recursive: true });

  for (const slug of slugs) {
    const card = manifest[slug];
    if (!card) { console.log(`! no manifest entry: ${slug}`); continue; }
    const base = buildQuery(card.name, "Kobe Bryant");
    const queries = [`${base} PSA front`, `${base} PSA`, base];

    // Collect unique candidate URLs (eBay first — single-listing photos — then DDG).
    const seen = new Set<string>();
    const cands: { url: string; title: string; source: string }[] = [];
    for (const q of queries) {
      try { for (const r of await searchEbayAll(q)) {
        if (!seen.has(r.imageUrl) && !BACK_RE.test(r.title)) { seen.add(r.imageUrl); cands.push({ ...r, source: "ebay" }); }
      } } catch { /* eBay optional */ }
    }
    for (const q of queries) {
      for (const r of await searchDuckDuckGoAll(q)) {
        if (!seen.has(r.imageUrl) && !BACK_RE.test(r.title)) { seen.add(r.imageUrl); cands.push({ imageUrl: r.imageUrl, title: r.title, source: "ddg" } as never); }
      }
      if (cands.length >= N * 2) break;
    }

    const dir = path.join(outDir, slug);
    mkdirSync(dir, { recursive: true });
    const saved: Record<string, unknown>[] = [];
    let i = 0;
    for (const c of cands) {
      if (saved.length >= N) break;
      const url = (c as { url?: string; imageUrl?: string }).url ?? (c as { imageUrl?: string }).imageUrl!;
      const local = await dl(url, path.join(dir, String(i)));
      if (local) { saved.push({ idx: i, url, title: c.title, source: c.source, localPath: local }); i++; }
    }
    writeFileSync(path.join(dir, "meta.json"), JSON.stringify({
      id: card.id, slug, name: card.name, brand: card.brand, baseNumber: card.baseNumber, type: card.type, candidates: saved,
    }, null, 2));
    console.log(`  ${slug}: ${saved.length} candidate(s)`);
  }
  console.log("Done fetching candidates.");
}
main().catch((e) => { console.error(e); process.exit(1); });
