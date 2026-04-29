import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PodiumCard } from "@/components/leaderboard/PodiumCard";
import type { CapperRow } from "@/lib/types";

const sample: CapperRow = {
  capper_id: "abc",
  handle: "fadeai_",
  display_name: "FADE AI",
  tier: 1,
  activity_status: "active",
  is_claimed: false,
  follower_count: 2100,
  profile_image_url: null,
  has_paid_program: false,
  picks_count: 87,
  wins: 47, losses: 39, pushes: 1,
  win_rate: 0.547,
  units_profit: 12.4,
  roi_pct: 14.2,
  clv_avg: 0.34,
  current_streak: 3,
  bet_type_breakdown: { ML: 1.0 },
  biggest_win: {
    units: 5.2, market: "ML", selection: "OAK", line: null, odds_taken: 210,
    game_label: "OAK @ LAA", game_date: "2026-04-08",
  },
  tracked_since: "2026-03-01T00:00:00Z",
  tweets_parsed: 87,
  parlay_share: 0,
  deleted_picks_count: 0,
  last_picks: [
    { kind: "straight", game_label: "NYY @ BOS", market: "ML", selection: "NYY", line: null, odds_taken: -135, outcome: "W", posted_at: "2026-04-15T00:00:00Z", profit_units: null, leg_count: null },
    { kind: "straight", game_label: "HOU @ SEA", market: "Total", selection: "Over 8.5", line: 8.5, odds_taken: -110, outcome: "L", posted_at: "2026-04-14T00:00:00Z", profit_units: null, leg_count: null },
  ],
};

describe("PodiumCard", () => {
  it("renders display name, handle, key stats for gold variant", () => {
    render(<PodiumCard rank={1} variant="gold" capper={sample} />);
    expect(screen.getByText("FADE AI")).toBeInTheDocument();
    expect(screen.getByText("@fadeai_")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("+12.4")).toBeInTheDocument();
    expect(screen.getByText("+14.2%")).toBeInTheDocument();
  });

  it("shows the Model tag when capper is fadeai_", () => {
    render(<PodiumCard rank={1} variant="gold" capper={sample} />);
    expect(screen.getByText("Model")).toBeInTheDocument();
  });

  it("does not show the Model tag for non-fadeai cappers", () => {
    render(<PodiumCard rank={2} variant="silver" capper={{ ...sample, handle: "sacstim" }} />);
    expect(screen.queryByText("Model")).not.toBeInTheDocument();
  });

  it("shows variant-specific rank label", () => {
    const { rerender } = render(<PodiumCard rank={1} variant="gold" capper={sample} />);
    expect(screen.getByText(/Champion/i)).toBeInTheDocument();
    rerender(<PodiumCard rank={2} variant="silver" capper={sample} />);
    expect(screen.getByText(/Runner-up/i)).toBeInTheDocument();
    rerender(<PodiumCard rank={3} variant="bronze" capper={sample} />);
    expect(screen.getByText(/Third/i)).toBeInTheDocument();
  });
});
