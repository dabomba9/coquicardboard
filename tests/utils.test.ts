import { describe, it, expect } from "vitest";
import { formatUsd, gradeKey, gradeLabel } from "@/lib/utils";

describe("formatUsd", () => {
  it("formats whole dollars without cents", () => {
    expect(formatUsd(5000)).toBe("$50");
    expect(formatUsd(250_000_00)).toBe("$250,000");
  });
  it("shows cents when not round", () => {
    expect(formatUsd(1999)).toBe("$19.99");
  });
  it("handles null/undefined", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(undefined)).toBe("—");
  });
});

describe("gradeKey / gradeLabel", () => {
  it("raw when not graded", () => {
    expect(gradeKey("raw", null, null)).toBe("raw");
    expect(gradeLabel("raw", null, null)).toBe("Raw");
  });
  it("composes company + grade when graded", () => {
    expect(gradeKey("graded", "PSA", 10)).toBe("PSA10");
    expect(gradeLabel("graded", "PSA", 10)).toBe("PSA 10");
    expect(gradeKey("graded", "BGS", 9.5)).toBe("BGS9.5");
  });
  it("falls back to raw if graded data incomplete", () => {
    expect(gradeKey("graded", null, null)).toBe("raw");
  });
});
