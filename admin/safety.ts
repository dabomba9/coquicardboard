/**
 * Guards shared by the destructive admin scripts.
 *
 * Two of these scripts are documented as routine steps but will destroy
 * production data if run against the wrong target or against an unexpectedly
 * empty bucket. The helpers here are pure (except for reading env) so the rules
 * are unit-tested rather than re-derived in each script.
 */

// `isLocal` is derived from the resolved HOST, not from the --cloud flag: these
// scripts can also be pointed at production by env-prefixing the command, and a
// banner that reads "(local)" while writing to prod is worse than no banner.
export type Target = { url: string; serviceKey: string; host: string; isLocal: boolean };

/**
 * Pick the Supabase target for an admin script.
 *
 * The old pattern — `(cloud && CLOUD_URL) || LOCAL_URL` — silently fell back to
 * LOCAL when `--cloud` was passed but CLOUD_* was unset or misspelled, so a
 * command aimed at production quietly deleted from the dev database instead.
 * An unresolvable `--cloud` must stop, never retarget.
 */
export function resolveTarget(
  opts: { cloud: boolean },
  env: Record<string, string | undefined> = process.env
): Target {
  const url = opts.cloud ? env.CLOUD_SUPABASE_URL : env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = opts.cloud ? env.CLOUD_SERVICE_ROLE_KEY : env.SUPABASE_SERVICE_ROLE_KEY;
  if (opts.cloud && !(url && serviceKey)) {
    throw new Error(
      "--cloud requires CLOUD_SUPABASE_URL and CLOUD_SERVICE_ROLE_KEY. Refusing to fall back to local."
    );
  }
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase URL or service-role key in .env.local");
  }
  const host = new URL(url).host;
  return { url, serviceKey, host, isLocal: /^(127\.0\.0\.1|localhost|\[::1\])(:|$)/.test(host) };
}

/** Fraction of existing image links a reconcile may clear before it looks like a mistake. */
export const RECONCILE_CLEAR_LIMIT = 0.1;

export type ReconcileStats = {
  /** Front images found in the bucket. */
  presentFronts: number;
  /** Cards in this catalog that currently have an image_url. */
  linkedNow: number;
  /** Cards that currently have a link the reconcile would null out. */
  wouldClear: number;
};

/**
 * Decide whether a reconcile run is safe to apply.
 *
 * `reconcile-vault-images` rebuilds image_url purely from what is in the
 * `vault-images` bucket, so an empty or partially-populated bucket silently
 * nulls links instead of "lighting up" new ones. On the cloud project that
 * bucket is empty — the images were re-homed to `card-images` keyed by card
 * UUID — so a --cloud run would have cleared every vault image link.
 */
export function reconcileVerdict(s: ReconcileStats): { ok: true } | { ok: false; reason: string } {
  if (s.presentFronts === 0) {
    return {
      ok: false,
      reason:
        "the bucket contains no front images, so this run would only clear links. " +
        "If this is the cloud project, its images live in `card-images` keyed by card UUID " +
        "(see admin/migrate-images-to-cloud.ts) and this script does not apply.",
    };
  }
  // A first-ever populate has nothing to lose, so the ratio is meaningless there.
  if (s.linkedNow > 0 && s.wouldClear / s.linkedNow > RECONCILE_CLEAR_LIMIT) {
    const pct = Math.round((s.wouldClear / s.linkedNow) * 100);
    return {
      ok: false,
      reason:
        `this run would clear ${s.wouldClear} of ${s.linkedNow} existing image links (${pct}%), ` +
        `over the ${Math.round(RECONCILE_CLEAR_LIMIT * 100)}% limit — the bucket is probably incomplete.`,
    };
  }
  return { ok: true };
}
