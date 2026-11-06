import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NcaabSlateView } from "@/components/slate/NcaabSlateView";
import { NCAAB_FIXTURE_GAMES } from "@/app/dev/ncaab-slate/fixture";

const FRONT = /Show all 14 picks on MCN at UNT/;

describe("NcaabSlateView", () => {
  it("renders a real button per card and flips on click", () => {
    render(<NcaabSlateView games={NCAAB_FIXTURE_GAMES} />);
    const front = screen.getByRole("button", { name: FRONT });
    const card = front.closest("[data-ncaab-game]") as HTMLElement;
    expect(card.dataset.open).toBe("false");
    fireEvent.click(front);
    expect(card.dataset.open).toBe("true");
    fireEvent.click(card.querySelector('button[aria-label="Back to summary"]') as HTMLButtonElement);
    expect(card.dataset.open).toBe("false");
  });

  it("moves focus to Back on open, back to the flip button on close, and closes on Escape", () => {
    render(<NcaabSlateView games={NCAAB_FIXTURE_GAMES} />);
    const front = screen.getByRole("button", { name: FRONT });
    const card = front.closest("[data-ncaab-game]") as HTMLElement;
    fireEvent.click(front);
    const back = card.querySelector('button[aria-label="Back to summary"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(back);
    fireEvent.keyDown(back, { key: "Escape" });
    expect(card.dataset.open).toBe("false");
    expect(document.activeElement).toBe(front);
  });

  it("keeps the summary as readable text outside the button", () => {
    render(<NcaabSlateView games={NCAAB_FIXTURE_GAMES} />);
    const front = screen.getByRole("button", { name: FRONT });
    expect(front.textContent).toBe("");
    const card = front.closest("[data-ncaab-game]") as HTMLElement;
    expect(card).toHaveTextContent("North Texas");
    expect(card).toHaveTextContent("8 SHARPS");
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
