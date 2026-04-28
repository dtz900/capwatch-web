import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterButton } from "@/components/leaderboard/FilterButton";

describe("FilterButton", () => {
  const defaults = {
    window: "all_time" as const,
    sort: "roi_pct" as const,
    min_picks: 5,
    active_only: true,
  };

  it("shows current filter state inline", () => {
    render(<FilterButton filters={defaults} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /All-time/i })).toBeInTheDocument();
    expect(screen.getByText(/ROI/)).toBeInTheDocument();
    expect(screen.getByText(/Min 5/)).toBeInTheDocument();
    expect(screen.getByText(/Active/)).toBeInTheDocument();
  });

  it("opens popover on click", () => {
    render(<FilterButton filters={defaults} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /All-time/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Window/i)).toBeInTheDocument();
  });

  it("calls onChange when a window is selected", () => {
    const calls: unknown[] = [];
    render(<FilterButton filters={defaults} onChange={(f) => calls.push(f)} />);
    fireEvent.click(screen.getByRole("button", { name: /All-time/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Last 7 days" }));
    expect(calls).toEqual([{ ...defaults, window: "last_7" }]);
  });
});
