import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EligibilityBadges } from "./EligibilityBadges";
import type { VipEligibility } from "@/lib/vip/types";

function row(over: Partial<VipEligibility>): VipEligibility {
  return {
    sport: "MLB",
    eligible: true,
    eligible_since: "2026-10-01",
    units: 12.34,
    n_picks: 41,
    n_floor_picks: 30,
    run_date: "2026-10-27",
    ...over,
  };
}

describe("EligibilityBadges", () => {
  it("eligible stat: exact sentence as aria-label, off-white units, picks count", () => {
    render(<EligibilityBadges eligibility={[row({})]} />);
    expect(
      screen.getByLabelText("Selling MLB VIP: +12.3u over last 30 days (41 picks)"),
    ).toBeInTheDocument();
    expect(screen.getByAltText("MLB")).not.toHaveClass("grayscale");
    expect(screen.getByText("+12.3u")).toHaveClass("text-[var(--color-text)]");
    expect(screen.getByText("41 picks")).toBeInTheDocument();
    expect(screen.getByText("last 30 days")).toBeInTheDocument();
  });

  it("closed stat: exact sentence as aria-label, muted units, never red", () => {
    render(
      <EligibilityBadges
        eligibility={[row({ sport: "NBA", eligible: false, units: -3.25, n_picks: 12, reason: "below_floor" })]}
      />,
    );
    screen.getByLabelText("Not currently selling: -3.3u NBA, last 30 days");
    expect(screen.getByText("-3.3u")).toHaveClass("text-[var(--color-text-muted)]");
    expect(screen.getByText("-3.3u")).not.toHaveClass("text-[var(--color-neg)]");
    expect(screen.getByText("12 picks")).toBeInTheDocument();
    expect(screen.getByAltText("NBA")).toHaveClass("grayscale");
  });

  it("selling sports lead the line", () => {
    render(
      <EligibilityBadges
        eligibility={[row({ sport: "MLB", eligible: false, units: -3 }), row({ sport: "NBA", units: 136.5 })]}
      />,
    );
    const groups = screen.getAllByRole("group");
    expect(groups[0]).toContainElement(screen.getByAltText("NBA"));
    expect(groups[1]).toContainElement(screen.getByAltText("MLB"));
  });

  it("no history row renders a muted 0.0u and 0 picks", () => {
    render(<EligibilityBadges eligibility={[row({ eligible: false, units: null, n_picks: null, reason: "no_record" })]} />);
    expect(screen.getByText("0.0u")).toHaveClass("text-[var(--color-text-muted)]");
    expect(screen.getByText("0 picks")).toBeInTheDocument();
  });

  it("renders nothing with no rows", () => {
    const { container } = render(<EligibilityBadges eligibility={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
