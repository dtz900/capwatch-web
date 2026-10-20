import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoardSkeleton } from "@/components/leaderboard/BoardSkeleton";

describe("BoardSkeleton", () => {
  it("announces itself as a loading region", () => {
    render(<BoardSkeleton />);
    expect(screen.getByRole("status", { name: "Loading leaderboard" })).toBeInTheDocument();
  });

  it("renders three podium placeholders, the banner slot, and ten row placeholders", () => {
    render(<BoardSkeleton />);
    expect(screen.getAllByTestId("podium-skeleton")).toHaveLength(3);
    expect(screen.getByTestId("banner-skeleton")).toBeInTheDocument();
    expect(screen.getAllByTestId("row-skeleton")).toHaveLength(10);
  });

  it("holds the banner slot between the podium and the standings table", () => {
    render(<BoardSkeleton />);
    const podium = screen.getAllByTestId("podium-skeleton")[0];
    const banner = screen.getByTestId("banner-skeleton");
    const row = screen.getAllByTestId("row-skeleton")[0];
    expect(podium.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(banner.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("paints no text, so it never becomes the page's largest content element", () => {
    const { container } = render(<BoardSkeleton />);
    expect(container.textContent).toBe("");
  });
});
