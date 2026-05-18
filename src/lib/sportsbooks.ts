/**
 * Per-sportsbook static metadata that does not live in the DB.
 *
 * The backend sportsbooks table holds operational fields (book_key,
 * display_name, brand_color, display_order, affiliate_param,
 * homepage_url_template, enabled). The two items below are
 * publisher-compliance assets, not operational data, so they live in
 * the frontend:
 *
 *  - logo:  the official sportsbook logo. Affiliate program terms
 *           require the CJ-provided creative, not a homemade brand
 *           treatment. Export the logo from the CJ Account Manager and
 *           drop it at the path below (see public/sportsbooks/README).
 *           If the file is missing, AffiliatePicker falls back to the
 *           text treatment so nothing breaks before the asset is in.
 *
 *  - termsUrl: the sportsbook's own terms and conditions page. Program
 *           terms require BetMGM T&Cs to be present and visible on the
 *           site wherever the CTA renders. AffiliateDisclaimer links it.
 *
 * Adding DraftKings / FanDuel later is one entry each here plus their
 * official assets in public/sportsbooks/.
 */
export interface SportsbookMeta {
  /** Public path to the official logo asset, or null to use the text fallback. */
  logo: string | null;
  /** Sportsbook terms and conditions URL. */
  termsUrl: string;
}

export const SPORTSBOOK_META: Record<string, SportsbookMeta> = {
  betmgm: {
    logo: "/sportsbooks/betmgm.png",
    termsUrl: "https://sports.betmgm.com/en/sports/terms",
  },
  // draftkings: { logo: "/sportsbooks/draftkings.png", termsUrl: "https://www.draftkings.com/help/terms" },
  // fanduel:    { logo: "/sportsbooks/fanduel.png",    termsUrl: "https://www.fanduel.com/terms" },
};

export function sportsbookMeta(bookKey: string): SportsbookMeta | undefined {
  return SPORTSBOOK_META[bookKey];
}
