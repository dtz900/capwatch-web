import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StandingsRow } from "@/components/leaderboard/StandingsRow";
import type { CapperRow } from "@/lib/types";

const row: CapperRow = {
  capper_id: "x", handle: "lineupwins", display_name: "Lineups Winning",
  tier: null, activity_status: "active", is_claimed: false,
  follower_count: 1400, profile_image_url: null,
  picks_count: 67, wins: 36, losses: 29, pushes: 2,
  win_rate: 0.55, units_profit: 5.2, roi_pct: 7.7, clv_avg: null,
  current_streak: 4,
  bet_type_breakdown: {},
  biggest_win: null, tracked_since: null, tweets_parsed: 0, parlay_share: 0,
  last_10_outcomes: ["W","W","W","L","W","L","W","W","W","L"],
};

describe("StandingsRow", () => {
  it("renders rank, name, handle, stats", () => {
    render(<StandingsRow rank={4} capper={row} />);
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("Lineups Winning")).toBeInTheDocument();
    expect(screen.getByText("@lineupwins")).toBeInTheDocument();
    expect(screen.getByText("67")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("+5.2")).toBeInTheDocument();
    expect(screen.getByText("+7.7%")).toBeInTheDocument();
  });

  it("colors negative units/ROI red", () => {
    const losing = { ...row, units_profit: -2.1, roi_pct: -2.4 };
    render(<StandingsRow rank={5} capper={losing} />);
    expect(screen.getByText("-2.1").className).toContain("text-[var(--color-neg)]");
  });
});
