import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LastPick } from "@/lib/types";
import { RecentPicks } from "./RecentPicks";

const pick: LastPick = {
  kind: "straight",
  game_label: null,
  market: "moneyline",
  selection: "Heat ML +150",
  line: null,
  odds_taken: -120,
  grading_odds: -120,
  grading_odds_source: "live_market_at_post",
  posted_odds: 150,
  outcome: "W",
  posted_at: null,
  profit_units: 0.8,
  leg_count: null,
  tweet_url: null,
};

describe("RecentPicks live market rows", () => {
  it("tags the pick and never shows the capper's original price", () => {
    const { container } = render(<RecentPicks picks={[pick]} />);
    expect(screen.getAllByText("Market odds")).toHaveLength(1);
    expect(screen.getByText("Heat ML -120")).toBeTruthy();
    expect(container.textContent).not.toContain("+150");
  });

  it("leaves ordinary picks untagged", () => {
    render(<RecentPicks picks={[{ ...pick, grading_odds_source: "posted" }]} />);
    expect(screen.queryByText("Market odds")).toBeNull();
  });
});
