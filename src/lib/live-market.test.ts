import { describe, expect, it } from "vitest";
import {
  LIVE_MARKET_WARNING,
  formatAmericanOdds,
  isLiveMarketPick,
  liveMarketPostedLine,
  liveMarketTooltip,
} from "./live-market";

describe("live market helpers", () => {
  it("formats American odds with an explicit plus", () => {
    expect(formatAmericanOdds(210)).toBe("+210");
    expect(formatAmericanOdds(-335)).toBe("-335");
  });

  it("detects the source", () => {
    expect(isLiveMarketPick({ grading_odds_source: "live_market_at_post" })).toBe(true);
    expect(isLiveMarketPick({ grading_odds_source: "posted" })).toBe(false);
    expect(isLiveMarketPick({})).toBe(false);
  });

  it("builds the posted line and the tooltip", () => {
    expect(liveMarketPostedLine(-104)).toBe(
      "Posted at -104 after the line moved. Graded at the live market price when posted.",
    );
    expect(liveMarketPostedLine(null)).toBeNull();
    expect(liveMarketTooltip(-104)).toBe(
      `Posted at -104 after the line moved. Graded at the live market price when posted.\n${LIVE_MARKET_WARNING}`,
    );
    expect(liveMarketTooltip(null)).toBe(LIVE_MARKET_WARNING);
  });
});
