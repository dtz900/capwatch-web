// tests/components/GameBlock.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameBlock } from "@/components/slate/GameBlock";
import type { SlateGame } from "@/lib/types";

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

describe("GameBlock state derivation", () => {
  it("renders the scheduled-state chip when game_state is scheduled", () => {
    render(<GameBlock game={makeGame()} />);
    expect(screen.queryByText(/FINAL/i)).toBeNull();
    expect(screen.queryByText(/TOP\s*\d/)).toBeNull();
  });
});
