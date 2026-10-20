import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoardSkeleton } from "@/components/leaderboard/BoardSkeleton";

describe("BoardSkeleton", () => {
  it("announces itself as a loading region", () => {
    render(<BoardSkeleton />);
    expect(screen.getByRole("status", { name: "Loading leaderboard" })).toBeInTheDocument();
  });

  it("renders three podium placeholders and ten row placeholders", () => {
    render(<BoardSkeleton />);
    expect(screen.getAllByTestId("podium-skeleton")).toHaveLength(3);
    expect(screen.getAllByTestId("row-skeleton")).toHaveLength(10);
  });

  it("paints no text, so it never becomes the page's largest content element", () => {
    const { container } = render(<BoardSkeleton />);
    expect(container.textContent).toBe("");
  });
});
