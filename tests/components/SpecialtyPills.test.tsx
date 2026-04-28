import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpecialtyPills } from "@/components/leaderboard/SpecialtyPills";

describe("SpecialtyPills", () => {
  it("renders one pill per market with rounded percent", () => {
    render(<SpecialtyPills breakdown={{ ML: 0.62, F5: 0.23, Total: 0.15 }} />);
    expect(screen.getByText("ML")).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByText("23%")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();
  });

  it("sorts highest share first", () => {
    render(<SpecialtyPills breakdown={{ Total: 0.15, ML: 0.62, F5: 0.23 }} />);
    const labels = screen.getAllByTestId("spec-label").map((e) => e.textContent);
    expect(labels).toEqual(["ML", "F5", "Total"]);
  });

  it("renders nothing for empty breakdown", () => {
    const { container } = render(<SpecialtyPills breakdown={{}} />);
    expect(container.firstChild).toBeNull();
  });
});
