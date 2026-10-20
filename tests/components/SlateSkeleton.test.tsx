import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

import { SlateSkeleton } from "@/components/slate/SlateSkeleton";

describe("SlateSkeleton", () => {
  it("renders the real heading and league chips so the shell matches the resolved board", () => {
    render(
      <SlateSkeleton
        sport="nba"
        heading="Tonight's slate"
        mlbCaption="Daily board"
        nflCaption="Weekly board"
        nbaCaption="Tonight"
        dateParam="today"
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Tonight's slate" })).toBeInTheDocument();
    expect(screen.getByText("MLB")).toBeInTheDocument();
    expect(screen.getByText("NFL")).toBeInTheDocument();
    expect(screen.getByText("NBA")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading slate" })).toBeInTheDocument();
  });

  it("shows the day toggle for day boards and hides it for the NFL week board", () => {
    const { rerender } = render(
      <SlateSkeleton sport="mlb" heading="Tonight's slate" mlbCaption="Tonight" nflCaption="Weekly board" nbaCaption="Daily board" dateParam="today" />,
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
    rerender(
      <SlateSkeleton sport="nfl" heading="Week 7 slate" mlbCaption="Daily board" nflCaption="Week 7" nbaCaption="Daily board" dateParam={null} />,
    );
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });

  it("renders the banner slot ahead of three game placeholders", () => {
    render(
      <SlateSkeleton sport="mlb" heading="Tonight's slate" mlbCaption="Tonight" nflCaption="Weekly board" nbaCaption="Daily board" dateParam="today" />,
    );
    const games = screen.getAllByTestId("game-skeleton");
    expect(games).toHaveLength(3);
    const banner = screen.getByTestId("banner-skeleton");
    expect(banner.compareDocumentPosition(games[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
