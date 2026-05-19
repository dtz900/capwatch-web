import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PayoutLadder } from "@/components/parlay-palace/PayoutLadder";
import type { PalaceLeg } from "@/lib/types";

const L = (i: number): PalaceLeg => ({
  leg_index: i, game_id: null, market: "ml", selection: `T${i}`, line: null,
  odds_taken: null, player_name: null, player_id: null, headshot_url: null,
  result_text: null, score_text: null, won: true, team_logo_url: null,
  team_abbr: null, away_logo_url: null, home_logo_url: null,
  away_abbr: null, home_abbr: null, is_clincher: false,
});

describe("PayoutLadder", () => {
  it("ramps 1u to the real final over N legs (no per-leg odds needed)", () => {
    render(<PayoutLadder legs={[L(0), L(1)]} finalUnits={4} />);
    expect(screen.getByText("4.00u")).toBeInTheDocument(); // header = real result
    expect(screen.getByText("2.0")).toBeInTheDocument();    // 4^(1/2)
    expect(screen.getByText("4.0")).toBeInTheDocument();    // 4^(2/2)
  });
  it("renders nothing for empty legs", () => {
    const { container } = render(<PayoutLadder legs={[]} finalUnits={20} />);
    expect(container.firstChild).toBeNull();
  });
  it("renders nothing when there is no real growth", () => {
    const { container } = render(
      <PayoutLadder legs={[L(0), L(1)]} finalUnits={1} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
