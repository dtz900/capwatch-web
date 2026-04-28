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

  it("renders all four filter groups", () => {
    render(<FilterBar filters={defaults} />);
    expect(screen.getByRole("toolbar", { name: /Filter leaderboard/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radiogroup")).toHaveLength(3);
    expect(screen.getByRole("switch", { name: /Active only/i })).toBeInTheDocument();
  });

  it("marks the current selections as checked", () => {
    render(<FilterBar filters={defaults} />);
    expect(screen.getByRole("radio", { name: "30d" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Units" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "10" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("allows clicking other window options", () => {
    render(<FilterBar filters={defaults} />);
    const sevenDay = screen.getByRole("radio", { name: "7d" });
    expect(sevenDay).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sevenDay);
  });
});
