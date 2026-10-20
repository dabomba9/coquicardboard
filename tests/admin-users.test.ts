import { describe, it, expect } from "vitest";
import { summarizeSignups, type SignupRow } from "@/lib/signups";

const row = (id: string, createdAt: string): SignupRow => ({
  id, email: `${id}@example.invalid`, createdAt, lastSignInAt: null, confirmed: true,
  username: id, displayName: null, isPublic: false, cardsTracked: 0, wants: 0,
});

describe("summarizeSignups", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  const s = summarizeSignups([row("old", "2026-08-07T12:00:00Z"), row("new", "2026-10-16T09:00:00Z"), row("mid", "2026-09-25T09:00:00Z")], now);
  it("sorts newest first", () => {
    expect(s.rows.map((r) => r.id)).toEqual(["new", "mid", "old"]);
  });
  it("counts recent sign-ups", () => {
    expect(s.total).toBe(3);
    expect(s.last7).toBe(1);
    expect(s.last30).toBe(2);
  });
  it("handles no accounts", () => {
    expect(summarizeSignups([], now)).toEqual({ rows: [], total: 0, last7: 0, last30: 0 });
  });
});
