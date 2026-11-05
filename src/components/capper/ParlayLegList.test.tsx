import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { HistoryPickLeg } from "@/lib/types";
import { ParlayLegList } from "./ParlayLegList";

const leg = (over: Partial<HistoryPickLeg>): HistoryPickLeg => ({
  leg_index: 0,
  market: "spread",
  selection: "Heat +9.5 -104",
  line: 9.5,
  odds_taken: -104,
  outcome: "W",
  game_label: "MIA @ BOS",
  ...over,
});

describe("ParlayLegList live market legs", () => {
  it("shows the market price with the tag, never the capper's price", () => {
    const repriced = leg({
      grading_odds: -335,
      grading_odds_source: "live_market_at_post",
      posted_odds: -104,
    });
    const { container } = render(<ParlayLegList legs={[repriced]} />);
    expect(screen.getAllByText("Market odds")).toHaveLength(1);
    expect(screen.getByText("-335")).toBeTruthy();
    expect(container.textContent).not.toContain("-104");
  });

  it("leaves ordinary legs on odds_taken without a tag", () => {
    render(<ParlayLegList legs={[leg({ grading_odds: -110, grading_odds_source: "posted" })]} />);
    expect(screen.queryByText("Market odds")).toBeNull();
    expect(screen.getByText("-104")).toBeTruthy();
  });
});
