import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankMark, RANK_BOARD_HREF } from "./RankMark";

describe("RankMark", () => {
  it("wreaths the podium and links to the all-time straights board", () => {
    render(<RankMark rank={3} />);
    const link = screen.getByRole("link", { name: /#3 on the all-time straights leaderboard/ });
    expect(link).toHaveAttribute("href", RANK_BOARD_HREF);
    expect(link.querySelector("svg ellipse")).not.toBeNull();
    expect(link.textContent).toContain("#3");
    expect(link.textContent).toMatch(/Straights/);
  });

  it("shows a plain number without laurels or label down to 25", () => {
    const { container } = render(<RankMark rank={12} size="sm" />);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent).toBe("#12");
  });

  it("shows nothing below 25 or unranked", () => {
    expect(render(<RankMark rank={26} />).container.innerHTML).toBe("");
    expect(render(<RankMark rank={null} />).container.innerHTML).toBe("");
    expect(render(<RankMark rank={undefined} />).container.innerHTML).toBe("");
  });
});
