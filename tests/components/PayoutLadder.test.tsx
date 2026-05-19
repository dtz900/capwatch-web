import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PayoutLadder } from "@/components/parlay-palace/PayoutLadder";
import type { PalaceLeg } from "@/lib/types";

const L = (i: number, odds: number): PalaceLeg => ({
  leg_index: i, game_id: null, market: "ml", selection: `T${i}`, line: null,
  odds_taken: odds, player_name: null, player_id: null, headshot_url: null,
  result_text: null, score_text: null, won: true, team_logo_url: null,
  team_abbr: null, away_logo_url: null, home_logo_url: null,
  away_abbr: null, home_abbr: null, is_clincher: false,
});

describe("PayoutLadder", () => {
  it("compounds american odds: 1u +100 +100 -> 4.00u, steps 2.0 then 4.0", () => {
    render(<PayoutLadder legs={[L(0, 100), L(1, 100)]} />);
    // final total in the header
    expect(screen.getByText("4.00u")).toBeInTheDocument();
    // per-step compounding values on the bars
    expect(screen.getByText("2.0")).toBeInTheDocument(); // after leg 1
    expect(screen.getByText("4.0")).toBeInTheDocument(); // after leg 2
  });
  it("renders nothing for empty legs", () => {
    const { container } = render(<PayoutLadder legs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
