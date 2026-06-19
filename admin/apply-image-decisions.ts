/**
 * Vision-verification helper, step 2 of 2 (see admin/verify-images.ts).
 * Applies per-card decisions from the audit: replace a wrong image with a
 * vision-confirmed candidate, or clear it (back to the styled placeholder).
 *
 *   npx tsx admin/apply-image-decisions.ts /tmp/kobe-verify/decisions.json
 *
 * decisions.json: [{ id, action: "keep" | "replace" | "clear", url?, source? }]
 *   - replace → downloadAndStore(url) then set image_url + image_source
 *   - clear   → image_url = null, image_source = null
 *   - keep    → no-op
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { downloadAndStore } from "../lib/image-store";

config({ path: ".env.local" });

const file = process.argv[2];
if (!file) { console.error("usage: apply-image-decisions.ts <decisions.json>"); process.exit(1); }

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type Decision = { id: string; action: "keep" | "replace" | "clear"; url?: string; source?: string };

async function main() {
  const decisions: Decision[] = JSON.parse(readFileSync(file, "utf8"));
  let replaced = 0, cleared = 0, kept = 0, failed = 0;

  for (const d of decisions) {
    if (d.action === "keep") { kept++; continue; }

    if (d.action === "replace") {
      if (!d.url) { console.log(`  ! replace without url: ${d.id}`); failed++; continue; }
      const stored = await downloadAndStore(db, d.id, d.url);
      if (!stored) { console.log(`  ✗ download failed, clearing instead: ${d.id}`);
        await db.from("cards").update({ image_url: null, image_source: null }).eq("id", d.id);
        cleared++; continue;
      }
      const { error } = await db.from("cards")
        .update({ image_url: stored, image_source: d.source ?? "verified (manual)" })
        .eq("id", d.id);
      if (error) { failed++; continue; }
      replaced++;
    } else if (d.action === "clear") {
      const { error } = await db.from("cards")
        .update({ image_url: null, image_source: null }).eq("id", d.id);
      if (error) { failed++; continue; }
      cleared++;
    }
  }
  console.log(`Done. replaced=${replaced} cleared=${cleared} kept=${kept} failed=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
