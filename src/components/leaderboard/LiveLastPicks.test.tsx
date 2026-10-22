import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PickTiles } from "./PickTiles";
import { RecentPicks } from "./RecentPicks";
import type { LastPick } from "@/lib/types";

// Leaderboard recent picks come from the stored snapshot, which now carries
// is_live (fadeai-platform #414, Codex P2 there).
const pick: LastPick = {
  kind: "straight",
  game_label: "BOS @ NYY",
  market: "ML",
  selection: "Yankees ML",
  line: null,
  odds_taken: 150,
  outcome: "W",
  posted_at: null,
  profit_units: null,
  leg_count: null,
  tweet_url: null,
};

describe("LIVE badge on leaderboard recent picks", () => {
  it("RecentPicks badges only live rows", () => {
    render(<RecentPicks picks={[{ ...pick, is_live: true }, { ...pick, selection: "Red Sox ML" }]} />);
    expect(screen.getAllByText("Live")).toHaveLength(1);
  });

  it("PickTiles shows it in the opened pick details", () => {
    render(<PickTiles picks={[{ ...pick, is_live: true }]} />);
    expect(screen.queryByText("Live")).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getAllByText("Live")).toHaveLength(1);
  });

  it("PickTiles details omit it for pregame picks", () => {
    render(<PickTiles picks={[pick]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Live")).toBeNull();
  });
});
