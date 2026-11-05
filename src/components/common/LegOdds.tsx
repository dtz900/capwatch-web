import { MarketOddsTag } from "@/components/common/MarketOddsTag";
import { displayedOdds, formatAmericanOdds, isLiveMarketPick } from "@/lib/live-market";

/** A parlay leg's price: the market price with the MARKET ODDS tag for a
 * repriced leg, otherwise the capper's odds_taken. Renders nothing when the
 * leg has no price. */
export function LegOdds({
  leg,
  className = "",
}: {
  leg: {
    odds_taken?: number | null;
    grading_odds?: number | null;
    grading_odds_source?: string | null;
    posted_odds?: number | null;
  };
  className?: string;
}) {
  const odds = displayedOdds(leg);
  if (odds == null) return null;
  return (
    <>
      {isLiveMarketPick(leg) && <MarketOddsTag postedOdds={leg.posted_odds} />}
      <span className={className}>{formatAmericanOdds(odds)}</span>
    </>
  );
}
