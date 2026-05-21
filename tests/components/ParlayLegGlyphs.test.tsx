import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParlayLegGlyphs } from "@/components/capper/ParlayLegGlyphs";
import type { HistoryPickLeg } from "@/lib/types";

function makeLeg(overrides: Partial<HistoryPickLeg> = {}): HistoryPickLeg {
  return {
    leg_index: 0,
    market: "ml",
    selection: "Some team",
    line: null,
    odds_taken: -110,
    outcome: "W",
    game_label: "NYY @ BOS",
    ...overrides,
  };
}

describe("ParlayLegGlyphs", () => {
  it("renders one glyph per leg in order", () => {
    const legs = [
      makeLeg({ leg_index: 0, outcome: "W" }),
      makeLeg({ leg_index: 1, outcome: "W" }),
      makeLeg({ leg_index: 2, outcome: "L" }),
    ];
    render(<ParlayLegGlyphs legs={legs} />);
    const glyphs = screen.getAllByTestId("parlay-leg-glyph");
    expect(glyphs).toHaveLength(3);
    expect(glyphs[0]).toHaveAttribute("data-outcome", "W");
    expect(glyphs[1]).toHaveAttribute("data-outcome", "W");
    expect(glyphs[2]).toHaveAttribute("data-outcome", "L");
  });

  it("renders the push glyph for outcome P", () => {
    render(<ParlayLegGlyphs legs={[makeLeg({ outcome: "P" })]} />);
    const glyph = screen.getByTestId("parlay-leg-glyph");
    expect(glyph).toHaveAttribute("data-outcome", "P");
  });

  it("renders the pending glyph for outcome null", () => {
    render(<ParlayLegGlyphs legs={[makeLeg({ outcome: null })]} />);
    const glyph = screen.getByTestId("parlay-leg-glyph");
    expect(glyph).toHaveAttribute("data-outcome", "pending");
  });

  it("renders the leg selection as a hover title", () => {
    render(<ParlayLegGlyphs legs={[makeLeg({ selection: "Acuna over 1.5 bases" })]} />);
    expect(screen.getByTestId("parlay-leg-glyph")).toHaveAttribute(
      "title",
      "Acuna over 1.5 bases"
    );
  });

  it("returns null when legs is empty or undefined", () => {
    const { container: emptyContainer } = render(<ParlayLegGlyphs legs={[]} />);
    expect(emptyContainer.firstChild).toBeNull();
    const { container: undefContainer } = render(<ParlayLegGlyphs />);
    expect(undefContainer.firstChild).toBeNull();
  });
});
