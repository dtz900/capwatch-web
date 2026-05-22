import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameBlock } from "@/components/slate/GameBlock";
import type { SlateGame, SlatePick } from "@/lib/types";

function makePick(over: Partial<SlatePick> = {}): SlatePick {
  return {
    capper_id: 1,
    capper_rank: 1,
    handle: "alice",
    display_name: "Alice",
    profile_image_url: null,
    tier: 1,
    has_paid_program: false,
    kind: "straight",
    leg_count: null,
    market: "ml",
    selection: "CHC",
    line: null,
    odds_taken: -110,
    stake_units: 1,
    posted_at: null,
    tweet_url: null,
    source: "twitter",
    outcome: null,
    profit_units: null,
    ...over,
  };
}

function makeGame(over: Partial<SlateGame> = {}): SlateGame {
  return {
    game_id: 1,
    away_team: "CHC",
    home_team: "STL",
    away_starter: null,
    home_starter: null,
    game_date: "2026-05-22",
    game_time: "2026-05-22T23:05:00Z",
    game_state: "scheduled",
    away_score: null,
    home_score: null,
    inning: null,
    inning_half: null,
    outs: null,
    picks: [],
    ...over,
  };
}

describe("GameBlock", () => {
  it("scheduled state shows formatted time, no FINAL, no bookie action", () => {
    render(<GameBlock game={makeGame()} />);
    expect(screen.queryByText(/FINAL/)).toBeNull();
    expect(screen.queryByText(/Bookie action/i)).toBeNull();
  });

  it("in_progress shows TOP 4 pill + both scores", () => {
    render(
      <GameBlock
        game={makeGame({
          game_state: "in_progress",
          away_score: 2,
          home_score: 1,
          inning: 4,
          inning_half: "top",
        })}
      />,
    );
    expect(screen.getByText(/TOP 4/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("final + ungraded picks renders final_pending (FINAL · grading…)", () => {
    render(
      <GameBlock
        game={makeGame({
          game_state: "final",
          away_score: 5,
          home_score: 3,
          picks: [makePick({ outcome: null })],
        })}
      />,
    );
    expect(screen.getByText(/FINAL/)).toBeInTheDocument();
    expect(screen.getByText(/grading/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bookie action/i)).toBeNull();
  });

  it("final + all picks graded renders final_graded and the bookie action footer", () => {
    render(
      <GameBlock
        game={makeGame({
          game_state: "final",
          away_score: 5,
          home_score: 3,
          picks: [
            makePick({ selection: "CHC", outcome: "W", profit_units: 0.91, stake_units: 1 }),
            makePick({ capper_id: 2, selection: "STL", outcome: "L", profit_units: -1.0, stake_units: 1 }),
          ],
        })}
      />,
    );
    expect(screen.getByText(/FINAL/)).toBeInTheDocument();
    expect(screen.queryByText(/grading/i)).toBeNull();
    expect(screen.getByText(/Bookie action/i)).toBeInTheDocument();
    expect(screen.getByText(/AWAY backers/i)).toBeInTheDocument();
    expect(screen.getByText(/HOME backers/i)).toBeInTheDocument();
  });

  it("side header shows units risked next to sharp count (pre-grade)", () => {
    render(
      <GameBlock
        game={makeGame({
          picks: [
            makePick({ selection: "CHC", stake_units: 2.0 }),
            makePick({ capper_id: 2, selection: "CHC", stake_units: 1.25 }),
          ],
        })}
      />,
    );
    expect(screen.getByText(/3\.25u/)).toBeInTheDocument();
  });

  it("void picks drop out of the risked tally", () => {
    render(
      <GameBlock
        game={makeGame({
          game_state: "final",
          away_score: 5,
          home_score: 3,
          picks: [
            makePick({ selection: "CHC", stake_units: 1.0, outcome: "W", profit_units: 0.91 }),
            makePick({ capper_id: 2, selection: "CHC", stake_units: 2.0, outcome: "V", profit_units: 0 }),
          ],
        })}
      />,
    );
    expect(screen.getByText(/1\.00u/)).toBeInTheDocument();
  });

  it("ungraded parlay legs do not gate final_graded (they wait on other games)", () => {
    // Real-world case: a parlay leg lives on this game but the parent
    // parlay can't grade until OTHER games on the slate finish. Treating
    // that leg as "this game still pending" would leave the card stuck
    // in final_pending long after the game itself is settled.
    render(
      <GameBlock
        game={makeGame({
          game_state: "final",
          away_score: 4,
          home_score: 2,
          picks: [
            makePick({ kind: "straight", selection: "CHC", outcome: "W", profit_units: 1.2, stake_units: 1 }),
            makePick({ capper_id: 2, kind: "parlay_leg", selection: "CHC", outcome: null, profit_units: null, stake_units: 1, leg_count: 5 }),
          ],
        })}
      />,
    );
    expect(screen.getByText(/FINAL/)).toBeInTheDocument();
    expect(screen.queryByText(/grading/i)).toBeNull();
    expect(screen.getByText(/Bookie action/i)).toBeInTheDocument();
  });
});
