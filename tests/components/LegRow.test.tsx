import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegRow } from "@/components/parlay-palace/LegRow";
import type { PalaceLeg } from "@/lib/types";

const base: PalaceLeg = {
  leg_index: 3, game_id: "777", market: "ml", selection: "Texas Rangers",
  line: null, odds_taken: -136, player_name: null, player_id: null,
  headshot_url: null, result_text: null, score_text: "TEX 5, SEA 1",
  won: true, team_logo_url: "https://www.mlbstatic.com/team-logos/140.svg",
  team_abbr: "TEX", is_clincher: true,
};

describe("LegRow", () => {
  it("renders team, score, win check, odds, sequential number + clincher tag", () => {
    render(<LegRow leg={base} position={4} />);
    expect(screen.getByText(/Texas Rangers/)).toBeInTheDocument();
    expect(screen.getByText("TEX 5, SEA 1")).toBeInTheDocument();
    expect(screen.getByText(/Leg 4/)).toBeInTheDocument();
    expect(screen.getByText(/clincher/i)).toBeInTheDocument();
    expect(screen.getByText("-136")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
    const logo = screen.getByRole("img");
    expect(logo).toHaveAttribute("src",
      "https://www.mlbstatic.com/team-logos/140.svg");
  });
  it("falls back to player headshot for prop legs and shows result_text", () => {
    const prop: PalaceLeg = { ...base, market: "prop", selection: "OVER",
      line: 6.5, player_name: "Gallen", team_logo_url: null, team_abbr: null,
      headshot_url: "https://midfield.mlbstatic.com/v1/people/1/spots/120",
      score_text: null, result_text: "8 K", is_clincher: false };
    render(<LegRow leg={prop} position={2} />);
    expect(screen.getByText("8 K")).toBeInTheDocument();
    expect(screen.getByText(/Leg 2/)).toBeInTheDocument();
    expect(screen.queryByText(/clincher/i)).toBeNull();
    expect(screen.getByRole("img")).toHaveAttribute("src",
      "https://midfield.mlbstatic.com/v1/people/1/spots/120");
  });
});
