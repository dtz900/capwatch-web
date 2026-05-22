/**
 * Affiliate creative registry. CJ (and most networks) host the image and
 * click URLs themselves, so all we store is the URL pair plus dimensions.
 * Swap a creative by editing the URLs here, not by touching components.
 *
 * The click URL accepts a `?sid=` param that CJ surfaces in conversion
 * reports, so we tag every placement with a stable slug ("capper-inline",
 * "slate-header", etc) to see which surface drives signups.
 */

export type SportsbookCreativeSize = "300x250" | "120x600" | "1080x356";

export interface SportsbookCreative {
  /** Advertiser shown to users via aria-label fallback. */
  advertiser: string;
  size: SportsbookCreativeSize;
  /** CJ click URL, sans `?sid=` (we append per-placement at render time). */
  clickUrl: string;
  /** CJ image URL, fully resolved. */
  imageUrl: string;
  width: number;
  height: number;
  /** Alt text used by screen readers. CJ leaves this empty in their HTML;
   * we set a descriptive one for accessibility + SEO hygiene. */
  alt: string;
}

export const BETMGM_300x250: SportsbookCreative = {
  advertiser: "BetMGM",
  size: "300x250",
  clickUrl: "https://www.anrdoezrs.net/click-101754995-17025940",
  imageUrl: "https://www.awltovhc.com/image-101754995-17025940",
  width: 300,
  height: 250,
  alt: "BetMGM Sportsbook offer",
};

/**
 * Append a placement slug to the CJ click URL as `?sid=` (or `&sid=` when
 * the URL already has a query). CJ records this verbatim against any
 * downstream conversion, so the slug should stay stable across releases.
 */
export function buildClickUrl(
  creative: SportsbookCreative,
  placement: string,
): string {
  const sep = creative.clickUrl.includes("?") ? "&" : "?";
  return `${creative.clickUrl}${sep}sid=${encodeURIComponent(placement)}`;
}
