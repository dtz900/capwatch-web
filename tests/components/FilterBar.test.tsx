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
    bet_type: "all" as const,
  };

  it("renders both mobile and desktop toolbars with four radiogroups on desktop", () => {
    render(<FilterBar filters={defaults} />);
    expect(screen.getAllByRole("toolbar", { name: /Filter leaderboard/i })).toHaveLength(2);
    expect(screen.getAllByRole("radiogroup")).toHaveLength(4);
  });

  it("marks the current selections as checked", () => {
    render(<FilterBar filters={defaults} />);
    expect(screen.getByRole("radio", { name: "30d" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Units" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Active" })).toHaveAttribute("aria-checked", "true");
    // "All" appears in both Show (active_only=false) and Bet type (bet_type=all)
    // so use getAllByRole and verify the bet-type one is checked.
    const alls = screen.getAllByRole("radio", { name: "All" });
    expect(alls.some((b) => b.getAttribute("aria-checked") === "true")).toBe(true);
  });

  it("optimistically updates show selection on click", () => {
    render(<FilterBar filters={defaults} />);
    // Click the "All" inside the Show group (the unchecked one).
    const alls = screen.getAllByRole("radio", { name: "All" });
    const showAll = alls.find((b) => b.getAttribute("aria-checked") === "false");
    expect(showAll).toBeDefined();
    fireEvent.click(showAll!);
    expect(screen.getByRole("radio", { name: "Active" })).toHaveAttribute("aria-checked", "false");
  });
});
