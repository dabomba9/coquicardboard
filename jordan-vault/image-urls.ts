// Where a Jordan Vault card image lives on tcdb.com NOW.
//
// data/cards.json stores the addresses jordan-vault.com reported at scrape time:
//   https://www.tcdb.com/Images/Cards/{sport}/{sid}/{sid}-{cid}Fr.jpg   (Bk for backs)
// TCDB has since moved most scans, so those 404 (an HTML "Page Not Found", not an
// image) — which is why the backfill stalled for months. The same scan is still
// served, keyed by the same card id, at:
//   Images/Large/{sport}/{sid}/{sid}-{cid}Fr.jpg         full size, when present
//   Images/Thumbs/{sport}/{sid}/{sid}_{cid}Thumb2.jpg    front thumbnail (Thumb4 = back)
// "Rep" files ({sid}-{cid}RepFr.jpg) are TCDB stand-ins, NOT the card itself, so
// for those we only ever try the real-card addresses.

const TCDB_CARD = /^https?:\/\/www\.tcdb\.com\/Images\/Cards\/([^/]+)\/(\d+)\/\2-(\d+)(Rep)?(Fr|Bk)\.jpg$/i;

export type CandidateKind = "large" | "original" | "thumb" | "external";
export type Candidate = { url: string; kind: CandidateKind };

/** True for a TCDB stand-in ("Rep") image address. */
export function isRepUrl(url: string): boolean {
  return TCDB_CARD.exec(url)?.[4] != null;
}

/** Addresses to try for one image, best first. Non-TCDB URLs pass through unchanged. */
export function candidateUrls(url: string): Candidate[] {
  const m = TCDB_CARD.exec(url);
  if (!m) return [{ url, kind: "external" }];
  const [, sport, sid, cid, rep, side] = m;
  const base = "https://www.tcdb.com/Images";
  const suffix = side.toLowerCase() === "fr" ? "Fr" : "Bk";
  const thumb = suffix === "Fr" ? "Thumb2" : "Thumb4";
  return [
    { url: `${base}/Large/${sport}/${sid}/${sid}-${cid}${suffix}.jpg`, kind: "large" },
    ...(rep ? [] : [{ url, kind: "original" as const }]),
    { url: `${base}/Thumbs/${sport}/${sid}/${sid}_${cid}${thumb}.jpg`, kind: "thumb" },
  ];
}
