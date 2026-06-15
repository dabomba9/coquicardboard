// A price is "real" only if it came from the marketplace (eBay sold/asking). The
// app never surfaces any other source, so fabricated/estimated rows can't show up
// even if they were ever (re)introduced.
export function isRealPriceSource(source: string | null | undefined): boolean {
  return !!source && source.startsWith("ebay");
}
