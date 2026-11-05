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

describe("HistoryRow live market rows", () => {
  const live: HistoryPick = {
    ...base,
    market: "spread",
    selection: "Heat +9.5",
    line: 9.5,
    odds_taken: -335,
    grading_odds: -335,
    grading_odds_source: "live_market_at_post",
    posted_odds: -104,
    outcome: "W",
    profit_units: 0.3,
  };

  it("shows the market price with the MARKET ODDS tag on desktop and mobile", () => {
    render(<HistoryRow pick={live} isLast />);
    expect(screen.getAllByText("Market odds")).toHaveLength(2);
    expect(screen.getAllByText(/-335/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/-104/, { selector: "span, div" })).not.toBeNull();
  });

  it("carries the posted-price and warning lines in the tooltip", () => {
    render(<HistoryRow pick={live} isLast />);
    const tip = screen.getAllByText("Market odds")[0].getAttribute("title") ?? "";
    expect(tip).toContain(
      "Posted at -104 after the line moved. Graded at the live market price when posted.",
    );
    expect(tip).toContain("Live picks count at the price followers can get.");
  });

  it("shows the lines as visible text on the mobile card", () => {
    render(<HistoryRow pick={live} isLast />);
    expect(
      screen.getByText("Posted at -104 after the line moved. Graded at the live market price when posted."),
    ).toBeTruthy();
    expect(screen.getByText("Live picks count at the price followers can get.")).toBeTruthy();
  });

  it("formats a positive market price with a plus", () => {
    render(
      <HistoryRow pick={{ ...live, odds_taken: 210, grading_odds: 210, posted_odds: 150 }} isLast />,
    );
    expect(screen.getAllByText(/\+210/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Posted at \+150/)).toBeTruthy();
  });

  it("leaves ordinary rows untagged", () => {
    render(
      <HistoryRow
        pick={{ ...live, grading_odds_source: "posted", odds_taken: -110, grading_odds: -110, posted_odds: null }}
        isLast
      />,
    );
    expect(screen.queryByText("Market odds")).toBeNull();
  });
});
