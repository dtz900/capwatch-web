import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PayoutLadder } from "@/components/parlay-palace/PayoutLadder";
import type { PalaceLeg } from "@/lib/types";

const L = (i: number, odds: number): PalaceLeg => ({
  leg_index: i, game_id: null, market: "ml", selection: `T${i}`, line: null,
  odds_taken: odds, player_name: null, player_id: null, headshot_url: null,
  result_text: null, score_text: null, won: true, team_logo_url: null,
  team_abbr: null, is_clincher: false,
});

describe("PayoutLadder", () => {
  it("compounds american odds into a running unit total", () => {
    render(<PayoutLadder legs={[L(0, 100), L(1, 100)]} />);
    expect(screen.getByText("2.00u")).toBeInTheDocument();   // after leg 1
    expect(screen.getByText("4.00u")).toBeInTheDocument();   // after leg 2
  });
  it("renders nothing for empty legs", () => {
    const { container } = render(<PayoutLadder legs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
