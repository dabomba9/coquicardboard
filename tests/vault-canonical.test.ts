import { describe, it, expect } from "vitest";
import { vaultCanonical } from "@/lib/vault-filter";

describe("vaultCanonical", () => {
  it("self-canonicalizes plain pagination", () => {
    expect(vaultCanonical("/kobe-vault", { page: "5" })).toBe("/kobe-vault?page=5");
  });
  it("collapses page 1, filters, searches and sorts to the hub", () => {
    expect(vaultCanonical("/kobe-vault", {})).toBe("/kobe-vault");
    expect(vaultCanonical("/kobe-vault", { page: "1" })).toBe("/kobe-vault");
    expect(vaultCanonical("/kobe-vault", { page: "5", year: "2008" })).toBe("/kobe-vault");
    expect(vaultCanonical("/kobe-vault", { page: "5", sort: "name" })).toBe("/kobe-vault");
    expect(vaultCanonical("/kobe-vault", { q: "prizm" })).toBe("/kobe-vault");
  });
  it("ignores empty params and junk page values", () => {
    expect(vaultCanonical("/vault", { page: "3", q: "" })).toBe("/vault?page=3");
    expect(vaultCanonical("/vault", { page: "abc" })).toBe("/vault");
  });
});
