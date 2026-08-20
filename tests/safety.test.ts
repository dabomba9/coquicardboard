import { describe, it, expect } from "vitest";
import { resolveTarget, reconcileVerdict, RECONCILE_CLEAR_LIMIT } from "@/admin/safety";

const LOCAL: Record<string, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "local-key",
};
const BOTH: Record<string, string | undefined> = {
  ...LOCAL,
  CLOUD_SUPABASE_URL: "https://abc123.supabase.co",
  CLOUD_SERVICE_ROLE_KEY: "cloud-key",
};

describe("resolveTarget", () => {
  it("uses the local pair by default", () => {
    const t = resolveTarget({ cloud: false }, BOTH);
    expect(t.url).toBe("http://127.0.0.1:54321");
    expect(t.serviceKey).toBe("local-key");
    expect(t.host).toBe("127.0.0.1:54321");
  });

  it("uses the cloud pair for --cloud", () => {
    const t = resolveTarget({ cloud: true }, BOTH);
    expect(t.url).toBe("https://abc123.supabase.co");
    expect(t.serviceKey).toBe("cloud-key");
    expect(t.host).toBe("abc123.supabase.co");
  });

  // The bug this exists to prevent: --cloud silently deleting from local.
  it("refuses --cloud when the cloud vars are missing, never falling back to local", () => {
    expect(() => resolveTarget({ cloud: true }, LOCAL)).toThrow(/Refusing to fall back to local/);
    expect(() => resolveTarget({ cloud: true }, { ...BOTH, CLOUD_SERVICE_ROLE_KEY: undefined }))
      .toThrow(/Refusing to fall back to local/);
  });

  // The banner these scripts print is driven by this flag, not by --cloud: they can
  // also be aimed at prod by env-prefixing, and "(local)" over a prod write is worse
  // than no banner at all.
  it("marks the target local or remote from the resolved host", () => {
    expect(resolveTarget({ cloud: false }, BOTH).isLocal).toBe(true);
    expect(resolveTarget({ cloud: true }, BOTH).isLocal).toBe(false);
    // env-prefixed at a cloud host without --cloud must still read as remote
    const prefixed = { ...BOTH, NEXT_PUBLIC_SUPABASE_URL: "https://abc123.supabase.co" };
    expect(resolveTarget({ cloud: false }, prefixed).isLocal).toBe(false);
  });

  it("errors when local config is absent too", () => {
    expect(() => resolveTarget({ cloud: false }, {})).toThrow(/Missing Supabase URL/);
  });
});

describe("reconcileVerdict", () => {
  // The production case: cloud's vault-images bucket is empty because the images
  // were re-homed to card-images, so a --cloud run would clear every link.
  it("refuses when the bucket has no front images", () => {
    const v = reconcileVerdict({ presentFronts: 0, linkedNow: 2994, wouldClear: 2994 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/no front images/);
  });

  it("refuses even an empty bucket against an unlinked catalog", () => {
    expect(reconcileVerdict({ presentFronts: 0, linkedNow: 0, wouldClear: 0 }).ok).toBe(false);
  });

  it("allows a normal reconcile that only adds links", () => {
    expect(reconcileVerdict({ presentFronts: 2994, linkedNow: 2900, wouldClear: 0 }).ok).toBe(true);
  });

  it("allows a first-ever populate, where nothing is linked yet", () => {
    expect(reconcileVerdict({ presentFronts: 500, linkedNow: 0, wouldClear: 0 }).ok).toBe(true);
  });

  it("allows clearing a few stale links, up to the limit", () => {
    expect(reconcileVerdict({ presentFronts: 1000, linkedNow: 1000, wouldClear: 100 }).ok).toBe(true);
  });

  it("refuses when the run would clear more than the limit", () => {
    const v = reconcileVerdict({ presentFronts: 1000, linkedNow: 1000, wouldClear: 101 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/would clear 101 of 1000/);
  });

  it("pins the limit at 10%", () => {
    expect(RECONCILE_CLEAR_LIMIT).toBe(0.1);
  });
});
