import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParlayLegList } from "@/components/capper/ParlayLegList";
import type { HistoryPickLeg } from "@/lib/types";

const legs: HistoryPickLeg[] = [
  {
    leg_index: 0,
    market: "prop",
    selection: "Acuna over 1.5 bases",
    line: 1.5,
    odds_taken: 115,
    outcome: "W",
    game_label: "ATL @ MIA",
  },
  {
    leg_index: 1,
    market: "prop",
    selection: "Judge HR anytime",
    line: null,
    odds_taken: 340,
    outcome: "L",
    game_label: "NYY @ BOS",
  },
];

describe("ParlayLegList", () => {
  it("renders one row per leg with selection text", () => {
    render(<ParlayLegList legs={legs} />);
    expect(screen.getByText("Acuna over 1.5 bases")).toBeInTheDocument();
    expect(screen.getByText("Judge HR anytime")).toBeInTheDocument();
  });

  it("renders positive odds with a plus sign and negative odds bare", () => {
    render(<ParlayLegList legs={[
      { ...legs[0], odds_taken: 115 },
      { ...legs[1], odds_taken: -130 },
    ]} />);
    expect(screen.getByText("+115")).toBeInTheDocument();
    expect(screen.getByText("-130")).toBeInTheDocument();
  });

  it("renders the game label", () => {
    render(<ParlayLegList legs={legs} />);
    expect(screen.getByText("ATL @ MIA")).toBeInTheDocument();
    expect(screen.getByText("NYY @ BOS")).toBeInTheDocument();
  });

  it("returns null when legs is empty", () => {
    const { container } = render(<ParlayLegList legs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
