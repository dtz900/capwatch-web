// tests/components/LegRow.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegRow } from "@/components/parlay-palace/LegRow";
import type { PalaceLeg } from "@/lib/types";

const leg: PalaceLeg = {
  leg_index: 4, game_id: "748002", market: "prop", selection: "OVER",
  line: 3.5, odds_taken: -152, player_name: "Zac Gallen", player_id: 668678,
  headshot_url: "https://midfield.mlbstatic.com/v1/people/668678/spots/120",
  result_text: "6 K", is_clincher: true,
};

describe("LegRow", () => {
  it("renders player, result, odds, and clincher marker", () => {
    render(<LegRow leg={leg} />);
    expect(screen.getByText(/Zac Gallen/)).toBeInTheDocument();
    expect(screen.getByText("6 K")).toBeInTheDocument();
    expect(screen.getByText("-152")).toBeInTheDocument();
    expect(screen.getByText(/clinch/i)).toBeInTheDocument();
  });
});
