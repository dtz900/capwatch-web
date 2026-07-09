import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayStrip } from "@/components/my-tails/TodayStrip";
import type { TodayPickEntry } from "@/lib/types";

const picks: TodayPickEntry[] = [
  { capper_id: 2, handle: "sbr_bets", display_name: "SBR", profile_image_url: null,
    kind: "straight", matchup: "DET @ TEX", market: "prop_batter_hrr",
    selection: "R.Greene o1.5 HRR", line: 1.5, odds_taken: -114,
    posted_at: "2026-07-08T14:00:00Z", outcome: null, profit_units: null },
  { capper_id: 9, handle: "wizbetz", display_name: "WizBetz", profile_image_url: null,
    kind: "straight", matchup: "NYY @ TB", market: "prop_pitcher_k",
    selection: "Cole u5.5 Ks", line: 5.5, odds_taken: -130,
    posted_at: "2026-07-08T15:00:00Z", outcome: "W", profit_units: 0.77 },
];

describe("TodayStrip", () => {
  it("renders count, entries and status pills", () => {
    render(<TodayStrip picks={picks} date="2026-07-08" />);
    expect(screen.getByText(/2 picks from your tails today/i)).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("WON")).toBeInTheDocument();
    expect(screen.getByText("DET @ TEX")).toBeInTheDocument();
  });

  it("renders the empty message with no picks", () => {
    render(<TodayStrip picks={[]} date="2026-07-08" />);
    expect(screen.getByText(/no picks from your tails yet today/i)).toBeInTheDocument();
  });
});
