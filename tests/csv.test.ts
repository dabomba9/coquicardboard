import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("builds a header + rows with CRLF", () => {
    expect(toCsv(["A", "B"], [[1, 2], [3, 4]])).toBe("A,B\r\n1,2\r\n3,4");
  });

  it("quotes fields with commas, quotes, or newlines", () => {
    expect(toCsv(["name"], [["Smith, John"]])).toBe('name\r\n"Smith, John"');
    expect(toCsv(["q"], [['a "quote"']])).toBe('q\r\n"a ""quote"""');
    expect(toCsv(["n"], [["line1\nline2"]])).toBe('n\r\n"line1\nline2"');
  });

  it("renders null/undefined as empty fields", () => {
    expect(toCsv(["a", "b"], [[null, "x"]])).toBe("a,b\r\n,x");
  });
});
