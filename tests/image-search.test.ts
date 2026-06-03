import { describe, it, expect } from "vitest";
import { buildQuery, isBackTitle } from "@/lib/image-search";

describe("buildQuery", () => {
  it("prefixes player and strips serial + parentheticals", () => {
    expect(buildQuery("1997 Metal Universe PMG Red #23 /100 (Qty. 90)")).toBe(
      "Michael Jordan 1997 Metal Universe PMG Red #23"
    );
  });
  it("leaves a clean name mostly intact", () => {
    expect(buildQuery("1986 Fleer #57 RC")).toBe("Michael Jordan 1986 Fleer #57 RC");
  });
});

describe("isBackTitle", () => {
  it("flags backs/reverse", () => {
    expect(isBackTitle("1986 Fleer Jordan BACK")).toBe(true);
    expect(isBackTitle("card reverse scan")).toBe(true);
  });
  it("does not flag fronts or 'throwback'", () => {
    expect(isBackTitle("1986 Fleer Michael Jordan PSA 10")).toBe(false);
    expect(isBackTitle("Throwback Thursday Jordan")).toBe(false);
  });
});
