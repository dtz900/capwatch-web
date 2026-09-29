import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { HistoryPick } from "@/lib/types";
import { HistoryRow } from "./HistoryRow";

const base: HistoryPick = {
  id: 1,
  kind: "straight",
  parlay_id: null,
  game_label: "PHI @ CHI",
  game_date: "2026-09-28",
  market: "player_receiving_yards",
  selection: "DeVonta Smith",
  line: 15,
  odds_taken: null,
  grading_odds: null,
  grading_odds_source: "no_close_available",
  units: 1,
  outcome: "W",
  profit_units: 0,
  posted_at: null,
  tweet_url: null,
  source: null,
};

describe("HistoryRow outcome-only rows", () => {
  // The row renders a desktop grid and a mobile card; both must carry the
  // stamp, so each outcome letter appears twice.
  it.each(["W", "L", "P"] as const)("stamps %s on desktop and mobile", (outcome) => {
    render(<HistoryRow pick={{ ...base, outcome }} isLast />);
    expect(screen.getAllByText(outcome)).toHaveLength(2);
    expect(screen.getAllByText("no odds given")).toHaveLength(2);
  });

  it("shows no stamp while the pick is ungraded", () => {
    render(<HistoryRow pick={{ ...base, outcome: null }} isLast />);
    expect(screen.queryByText("W")).toBeNull();
    expect(screen.queryByText("L")).toBeNull();
  });

  it("keeps the profit figure, not a stamp, on priced rows", () => {
    render(
      <HistoryRow
        pick={{ ...base, odds_taken: -110, grading_odds: -110, grading_odds_source: "posted", outcome: "L", profit_units: -1 }}
        isLast
      />,
    );
    expect(screen.queryByText("L")).toBeNull();
  });
});
