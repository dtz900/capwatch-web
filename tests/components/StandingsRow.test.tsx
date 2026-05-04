import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StandingsRow } from "@/components/leaderboard/StandingsRow";
import type { CapperRow } from "@/lib/types";

const row: CapperRow = {
  capper_id: "x", handle: "lineupwins", display_name: "Lineups Winning",
  tier: null, activity_status: "active", is_claimed: false,
  follower_count: 1400, profile_image_url: null, has_paid_program: false,
  picks_count: 67, wins: 36, losses: 29, pushes: 2,
  win_rate: 0.55, units_profit: 5.2, roi_pct: 7.7, clv_avg: null,
  current_streak: 4,
  bet_type_breakdown: {},
  biggest_win: null, tracked_since: null, tweets_parsed: 0, parlay_share: 0, deleted_picks_count: 0, live_picks_count: 0,
  last_picks: [
    { kind: "straight", game_label: "NYY @ BOS", market: "ML", selection: "NYY", line: null, odds_taken: -135, outcome: "W", posted_at: "2026-04-15T00:00:00Z", profit_units: null, leg_count: null, tweet_url: null },
  ],
};

describe("StandingsRow", () => {
  it("renders rank, name, handle, stats (in both desktop grid and mobile card)", () => {
    render(<StandingsRow rank={4} capper={row} />);
    expect(screen.getAllByText("04").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lineups Winning").length).toBeGreaterThan(0);
    expect(screen.getAllByText("@lineupwins").length).toBeGreaterThan(0);
    expect(screen.getAllByText("67").length).toBeGreaterThan(0);
    expect(screen.getAllByText("55%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+5.2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+7.7%").length).toBeGreaterThan(0);
  });

  it("colors negative units/ROI red", () => {
    const losing = { ...row, units_profit: -2.1, roi_pct: -2.4 };
    render(<StandingsRow rank={5} capper={losing} />);
    const negCells = screen.getAllByText("-2.1");
    expect(negCells.some((el) => el.className.includes("text-[var(--color-neg)]"))).toBe(true);
  });

  it("renders the mobile micro-grid stat labels", () => {
    render(<StandingsRow rank={4} capper={row} />);
    expect(screen.getByText("Picks")).toBeInTheDocument();
    expect(screen.getByText("Win")).toBeInTheDocument();
    expect(screen.getByText("Units")).toBeInTheDocument();
    expect(screen.getByText("ROI")).toBeInTheDocument();
  });
});
