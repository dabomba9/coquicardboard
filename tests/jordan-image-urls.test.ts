import { describe, it, expect } from "vitest";
import { candidateUrls, isRepUrl } from "@/jordan-vault/image-urls";

const T = "https://www.tcdb.com/Images";

describe("candidateUrls", () => {
  it("tries the stored address, then the thumbnail, then Large (throttled hardest) for a front", () => {
    expect(candidateUrls(`${T}/Cards/Basketball/29915/29915-3209536Fr.jpg`)).toEqual([
      { url: `${T}/Cards/Basketball/29915/29915-3209536Fr.jpg`, kind: "original" },
      { url: `${T}/Thumbs/Basketball/29915/29915_3209536Thumb2.jpg`, kind: "thumb" },
      { url: `${T}/Large/Basketball/29915/29915-3209536Fr.jpg`, kind: "large" },
    ]);
  });
  it("uses Bk / Thumb4 for a back", () => {
    const c = candidateUrls(`${T}/Cards/Basketball/2127/2127-2909433Bk.jpg`);
    expect(c[1].url).toBe(`${T}/Thumbs/Basketball/2127/2127_2909433Thumb4.jpg`);
    expect(c[2].url).toBe(`${T}/Large/Basketball/2127/2127-2909433Bk.jpg`);
  });
  it("never returns the Rep stand-in itself", () => {
    const rep = `${T}/Cards/Basketball/2059/2059-2987644RepFr.jpg`;
    expect(isRepUrl(rep)).toBe(true);
    const c = candidateUrls(rep);
    expect(c.map((x) => x.kind)).toEqual(["thumb", "large"]);
    expect(c.some((x) => x.url.includes("Rep"))).toBe(false);
  });
  it("handles hyphenated sport folders", () => {
    expect(candidateUrls(`${T}/Cards/Non-Sport/458540/458540-26142812Fr.jpg`)[1].url)
      .toBe(`${T}/Thumbs/Non-Sport/458540/458540_26142812Thumb2.jpg`);
  });
  it("passes non-TCDB URLs through", () => {
    const u = "https://i.ebayimg.com/images/g/YEYAAOSwM~NlAZBT/s-l1200.jpg";
    expect(candidateUrls(u)).toEqual([{ url: u, kind: "external" }]);
    expect(isRepUrl(u)).toBe(false);
  });
});
