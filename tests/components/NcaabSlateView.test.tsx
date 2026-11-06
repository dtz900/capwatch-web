import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NcaabSlateView } from "@/components/slate/NcaabSlateView";
import { NCAAB_FIXTURE_GAMES } from "@/app/dev/ncaab-slate/fixture";

describe("NcaabSlateView", () => {
  it("renders a real button per card and flips on click", () => {
    render(<NcaabSlateView games={NCAAB_FIXTURE_GAMES} />);
    const front = screen.getByRole("button", { name: /MCN at UNT.*14 picks/ });
    const card = front.closest("[data-ncaab-game]") as HTMLElement;
    expect(card.dataset.open).toBe("false");
    fireEvent.click(front);
    expect(card.dataset.open).toBe("true");
    fireEvent.click(screen.getAllByRole("button", { name: "Back to summary", hidden: true })[0]);
    expect(card.dataset.open).toBe("false");
  });

  it("collapses zero-pick games behind one expandable row", () => {
    render(<NcaabSlateView games={NCAAB_FIXTURE_GAMES} />);
    const toggle = screen.getByRole("button", { name: /5 more games with no picks/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    fireEvent.click(toggle);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });
});
