import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "@/components/leaderboard/FilterBar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("FilterBar", () => {
  const defaults = {
    window: "last_30" as const,
    sort: "units_profit" as const,
    min_picks: 10,
    active_only: true,
  };

  it("renders both mobile and desktop toolbars with three radiogroups on desktop", () => {
    render(<FilterBar filters={defaults} />);
    expect(screen.getAllByRole("toolbar", { name: /Filter leaderboard/i })).toHaveLength(2);
    expect(screen.getAllByRole("radiogroup")).toHaveLength(3);
  });

  it("marks the current selections as checked", () => {
    render(<FilterBar filters={defaults} />);
    expect(screen.getByRole("radio", { name: "30d" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Units" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Active" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "false");
  });

  it("optimistically updates show selection on click", () => {
    render(<FilterBar filters={defaults} />);
    const allBtn = screen.getByRole("radio", { name: "All" });
    fireEvent.click(allBtn);
    expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Active" })).toHaveAttribute("aria-checked", "false");
  });
});
