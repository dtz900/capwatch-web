/** A live pick posted at a price that no longer existed (the line had already
 * moved) is graded at the live market price from when it was posted. The API
 * marks those rows with grading_odds_source 'live_market_at_post' and keeps the
 * capper's own price in posted_odds. */
export const LIVE_MARKET_SOURCE = "live_market_at_post";

export function isLiveMarketPick(pick: {
  grading_odds_source?: string | null;
}): boolean {
  return pick.grading_odds_source === LIVE_MARKET_SOURCE;
}

/** The price to show next to a MARKET ODDS tag: the price the pick graded at
 * (grading_odds), never the capper's own odds_taken, which can still hold the
 * original price on rows repriced before the API kept the two in step. The
 * capper's own price shows only in the detail line (posted_odds). Rows without
 * the tag keep odds_taken. */
export function displayedOdds(pick: {
  grading_odds_source?: string | null;
  grading_odds?: number | null;
  odds_taken?: number | null;
}): number | null {
  if (isLiveMarketPick(pick)) return pick.grading_odds ?? pick.odds_taken ?? null;
  return pick.odds_taken ?? null;
}

/** Prices a selection string may still embed: the capper's own odds_taken and
 * posted_odds. Formatters strip these from the selection text so the original
 * price never shows beside the displayed market price. */
export function strippableOdds(pick: {
  odds_taken?: number | null;
  posted_odds?: number | null;
}): number[] {
  return [pick.odds_taken, pick.posted_odds].filter(
    (o): o is number => typeof o === "number",
  );
}

/** The pick with odds_taken swapped for the displayed price, for formatters
 * that read odds_taken, plus strip_odds so the original prices are still
 * stripped from the selection text. Returns the pick itself when nothing
 * changes. */
export function withDisplayedOdds<
  T extends {
    grading_odds_source?: string | null;
    grading_odds?: number | null;
    odds_taken?: number | null;
    posted_odds?: number | null;
  },
>(pick: T): T & { strip_odds?: number[] } {
  const odds = displayedOdds(pick);
  if (odds === (pick.odds_taken ?? null)) return pick;
  return { ...pick, odds_taken: odds, strip_odds: strippableOdds(pick) };
}

/** American odds with an explicit plus sign: +210, -335. */
export function formatAmericanOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : String(odds);
}

export const LIVE_MARKET_WARNING =
  "Live picks count at the price followers can get.";

export function liveMarketPostedLine(postedOdds: number | null | undefined): string | null {
  if (postedOdds == null) return null;
  return `Posted at ${formatAmericanOdds(postedOdds)} after the line moved. Graded at the live market price when posted.`;
}

/** Tooltip text: the posted-price line (when we have it) then the warning. */
export function liveMarketTooltip(postedOdds: number | null | undefined): string {
  return [liveMarketPostedLine(postedOdds), LIVE_MARKET_WARNING]
    .filter(Boolean)
    .join("\n");
}
