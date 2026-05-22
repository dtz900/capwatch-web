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
  /**
   * Click URL for mobile visitors. Typically routes to the operator's
   * Branch.io OneLink which detects platform and sends to App Store /
   * Google Play, then attributes the install + signup back via
   * deferred deep linking. Mobile users convert best via native app.
   */
  clickUrlMobile: string;
  /**
   * Click URL for desktop visitors. Typically routes to the operator's
   * web signup page (mediaserver / sports.betmgm.com). Desktop users
   * can't usefully act on an App Store landing, so we send them to
   * a browser-completable flow.
   */
  clickUrlDesktop: string;
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
 * 1080x356 wide rectangle, "$1,500 Paid Back" offer.
 *
 * Routes per device for maximum conversion:
 *   - Mobile (clickUrlMobile): CJ creative 17163619, OneLink → App Store
 *     or Play Store, attribution via Branch deferred deep link, $50 per
 *     App Qualified Player. This pairing has $141.56 3-month EPC.
 *   - Desktop (clickUrlDesktop): CJ creative 17235791, mediaserver web
 *     flow, visitor can create an account in-browser, $50 per Web
 *     Qualified Player. Replaces the previous desktop dead-end where
 *     laptop visitors landed on the iOS App Store page.
 *
 * Image stays the same across devices (BetMGM 1080x356 banner art from
 * CJ creative 17163619). Compliance: both URLs are CJ-provided affiliate
 * links for the same advertiser and the same offer copy ("$1,500 Paid
 * Back"), and CJ attributes commission by which click URL the visitor
 * actually hits.
 *
 * Both URLs commission $0 in IN, WV, NJ, MI per the BetMGM program
 * terms (BetMGM has direct media deals in those states).
 */
export const BETMGM_1080x356: SportsbookCreative = {
  advertiser: "BetMGM",
  size: "1080x356",
  clickUrlMobile: "https://www.anrdoezrs.net/click-101754995-17163619",
  clickUrlDesktop: "https://www.jdoqocy.com/click-101754995-17235791",
  imageUrl: "https://www.ftjcfx.com/image-101754995-17163619",
  width: 1080,
  height: 356,
  alt: "BetMGM Sportsbook — Get up to $1,500 paid back if your first bet does not win",
  legalStates: "all",
};

/**
 * 300x250 square, all-states. Kept in the registry for any sidebar /
 * inline-card placement where a wide rectangle would dominate too much.
 * Both URLs point at the same OneLink creative since BetMGM does not
 * offer a distinct web-flow 300x250 image variant in CJ; desktop
 * visitors on this creative still land at the App Store, so prefer
 * BETMGM_1080x356 for any placement that gets desktop traffic.
 */
export const BETMGM_300x250: SportsbookCreative = {
  advertiser: "BetMGM",
  size: "300x250",
  clickUrlMobile: "https://www.anrdoezrs.net/click-101754995-17025940",
  clickUrlDesktop: "https://www.anrdoezrs.net/click-101754995-17025940",
  imageUrl: "https://www.awltovhc.com/image-101754995-17025940",
  width: 300,
  height: 250,
  alt: "BetMGM Sportsbook offer",
  legalStates: "all",
};

/**
 * Append a placement slug to a CJ click URL as `?sid=` (or `&sid=` when
 * the URL already has a query). CJ records the sid verbatim against any
 * downstream conversion, so the slug should stay stable across releases.
 * Takes a raw URL rather than a creative so callers can pick which of
 * the per-device URLs to tag.
 */
export function buildClickUrl(baseUrl: string, placement: string): string {
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}sid=${encodeURIComponent(placement)}`;
}
