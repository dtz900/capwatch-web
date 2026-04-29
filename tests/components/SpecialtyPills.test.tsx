import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpecialtyPills } from "@/components/leaderboard/SpecialtyPills";

describe("SpecialtyPills", () => {
  it("normalizes raw markets into reader-friendly buckets", () => {
    render(<SpecialtyPills breakdown={{ ML: 0.62, F5_ML: 0.13, total: 0.25 }} />);
    expect(screen.getByText("Moneyline")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    // ML + F5_ML both bucket into Moneyline → 75%
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("collapses pitcher and batter props into Player prop", () => {
    render(<SpecialtyPills breakdown={{ prop_pitcher_outs: 0.4, prop_batter_hr: 0.3, ML: 0.3 }} />);
    expect(screen.getByText("Player prop")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("sorts highest share first after normalization", () => {
    render(<SpecialtyPills breakdown={{ total: 0.15, ML: 0.62, F5_ML: 0.23 }} />);
    const labels = screen.getAllByTestId("spec-label").map((e) => e.textContent);
    expect(labels[0]).toBe("Moneyline");
  });

  it("renders nothing for empty breakdown", () => {
    const { container } = render(<SpecialtyPills breakdown={{}} />);
    expect(container.firstChild).toBeNull();
  });
});
