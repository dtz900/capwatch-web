import { beforeAll, describe, expect, it } from "vitest";
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

// Tooltip reads (hover: none) on mount; jsdom has no matchMedia.
beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

describe("EligibilityBadges", () => {
  it("renders exact eligible copy", () => {
    render(<EligibilityBadges eligibility={[row({})]} />);
    expect(
      screen.getByText("Selling MLB VIP: +12.3u over last 30 days (41 picks)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Eligibility is recomputed nightly from the same record shown on this page."),
    ).toBeInTheDocument();
  });

  it("renders exact closed copy", () => {
    render(
      <EligibilityBadges
        eligibility={[row({ sport: "NBA", eligible: false, units: -3.25, n_picks: 12 })]}
      />,
    );
    expect(screen.getByText("Not currently selling: -3.3u NBA, last 30 days")).toBeInTheDocument();
  });

  it("renders nothing with no rows", () => {
    const { container } = render(<EligibilityBadges eligibility={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
