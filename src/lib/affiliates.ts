/**
 * Affiliate creative registry. CJ (and most networks) host the image and
 * click URLs themselves, so all we store is the URL pair plus dimensions.
 * Swap a creative by editing the URLs here, not by touching components.
 *
 * The click URL accepts a `?sid=` param that CJ surfaces in conversion
 * reports, so we tag every placement with a stable slug ("capper-inline",
 * "slate-header", etc) to see which surface drives signups.
 */

export type SportsbookCreativeSize =
  | "300x250"
  | "120x600"
  | "1080x356"
  | "728x90"
  | "320x50";

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
  /**
   * Documents which legal states this creative is approved for. "all"
   * means the offer copy is valid in every state BetMGM operates in.
   * A state-list variant ("NV only", "MI/NJ/PA/WV") means showing it to
   * out-of-state visitors is irrelevant rather than illegal but wastes
   * impressions. We're not geo-gating yet; this field is here so the
   * future rotator has the data.
   */
  legalStates: "all" | string[];
}

/**
 * 1080x356 wide rectangle, "$1,500 Paid Back" offer. Highest 3-month EPC
 * on the BetMGM CJ creative list at $141.56 USD as of 2026-02 — the only
 * variant with non-N/A EPC data. The offer is valid in every state
 * BetMGM operates in EXCEPT MI, NJ, NV, NY, Ontario, PA, PR, WV (those
 * states have their own variants with different bonus structures). For
 * visitors in excluded states, the click still tracks and BetMGM's
 * landing page geo-redirects to the correct local offer.
 */
export const BETMGM_1080x356: SportsbookCreative = {
  advertiser: "BetMGM",
  size: "1080x356",
  clickUrl: "https://www.anrdoezrs.net/click-101754995-17163619",
  imageUrl: "https://www.ftjcfx.com/image-101754995-17163619",
  width: 1080,
  height: 356,
  alt: "BetMGM Sportsbook — Get up to $1,500 paid back if your first bet does not win",
  legalStates: "all",
};

/**
 * 300x250 square, all-states. Kept in the registry for any sidebar /
 * inline-card placement where a tall rectangle would dominate too much,
 * but the wide 1080x356 is the default since it both performs better
 * (proven EPC) and fits the single-column layouts cleanly.
 */
export const BETMGM_300x250: SportsbookCreative = {
  advertiser: "BetMGM",
  size: "300x250",
  clickUrl: "https://www.anrdoezrs.net/click-101754995-17025940",
  imageUrl: "https://www.awltovhc.com/image-101754995-17025940",
  width: 300,
  height: 250,
  alt: "BetMGM Sportsbook offer",
  legalStates: "all",
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
