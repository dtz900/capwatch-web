import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormTicks } from "./FormTicks";
import type { LastPick } from "@/lib/types";

const pick = (outcome: LastPick["outcome"]): LastPick =>
  ({ kind: "straight", game_label: null, market: null, selection: null, line: null, odds_taken: null,
     outcome, posted_at: null, profit_units: null, leg_count: null } as LastPick);

describe("FormTicks", () => {
  it("reads oldest to newest with the newest tick taller", () => {
    // API order is newest first.
    render(<FormTicks picks={[pick("W"), pick("L"), pick("L"), pick("W"), pick("P"), pick("W"), pick("L")]} />);
    const strip = screen.getByRole("img");
    expect(strip).toHaveAttribute("aria-label", "Last 6 graded, oldest to newest: W P W L L W");
    const ticks = strip.querySelectorAll("span");
    expect(ticks).toHaveLength(6);
    expect(ticks[5].className).toContain("h-[7px]");
    expect(ticks[0].className).toContain("h-[5px]");
  });

  it("renders nothing with no graded picks", () => {
    expect(render(<FormTicks picks={[]} />).container.innerHTML).toBe("");
  });
});
