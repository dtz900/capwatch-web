import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero, HeroStats, HeroStatsSkeleton } from "@/components/leaderboard/Hero";

describe("Hero", () => {
  it("renders the stat row from a stats object", () => {
    render(<Hero sport="nfl" stats={{ totalPicks: 12345, cappersCount: 87 }} />);
    expect(screen.getByText("12,345")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("renders statsSlot in place of the stat row when provided", () => {
    render(<Hero sport="nfl" stats={{ totalPicks: 1, cappersCount: 1 }} statsSlot={<div data-testid="slot" />} />);
    expect(screen.getByTestId("slot")).toBeInTheDocument();
    expect(screen.queryByText("Picks graded")).not.toBeInTheDocument();
  });

  it("HeroStats renders nothing when no cappers are tracked", () => {
    const { container } = render(<HeroStats stats={{ totalPicks: 0, cappersCount: 0 }} />);
    expect(container.textContent).toBe("");
  });

  it("HeroStatsSkeleton reserves the stat row without painting text", () => {
    const { container } = render(<HeroStatsSkeleton />);
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toBe("");
  });
});
