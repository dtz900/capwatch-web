import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

import { SportToggle } from "@/components/slate/SportToggle";

describe("SportToggle", () => {
  it("orders the leagues NFL, NBA, MLB left to right", () => {
    render(<SportToggle current="mlb" mlbCaption="Tonight" nflCaption="Weekly board" nbaCaption="Daily board" />);
    const labels = screen.getAllByRole("radio").map((b) => b.textContent?.replace(/\s+/g, " ").trim());
    expect(labels[0]).toMatch(/^NFL/);
    expect(labels[1]).toMatch(/^NBA/);
    expect(labels[2]).toMatch(/^MLB/);
  });

  it("flags the other leagues that have games tonight", () => {
    render(
      <SportToggle
        current="mlb"
        mlbCaption="Tonight"
        nflCaption="Weekly board"
        nbaCaption="Daily board"
        tonight={{ nfl: 1, nba: 9, mlb: 2 }}
      />,
    );
    const nfl = screen.getByRole("radio", { name: /NFL/ });
    const nba = screen.getByRole("radio", { name: /NBA/ });
    const mlb = screen.getByRole("radio", { name: /MLB/ });
    expect(nfl).toHaveTextContent("1 tonight");
    expect(nba).toHaveTextContent("9 tonight");
    expect(nfl.querySelector("[data-signal]")).not.toBeNull();
    expect(nba.querySelector("[data-signal]")).not.toBeNull();
    // The selected league keeps its own caption: the board below is the signal.
    expect(mlb).toHaveTextContent("Tonight");
    expect(mlb).not.toHaveTextContent("2 tonight");
    expect(mlb.querySelector("[data-signal]")).toBeNull();
  });

  it("keeps the plain caption when a league has nothing tonight", () => {
    render(
      <SportToggle current="nba" mlbCaption="Daily board" nflCaption="Weekly board" nbaCaption="Tonight" tonight={{ nfl: 0 }} />,
    );
    const nfl = screen.getByRole("radio", { name: /NFL/ });
    expect(nfl).toHaveTextContent("Weekly board");
    expect(nfl.querySelector("[data-signal]")).toBeNull();
    const mlb = screen.getByRole("radio", { name: /MLB/ });
    expect(mlb).toHaveTextContent("Daily board");
  });
});
