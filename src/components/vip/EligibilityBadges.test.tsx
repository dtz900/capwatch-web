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
  it("eligible card: exact sentence as aria-label, SELLING chip, focal units, picks line", () => {
    render(<EligibilityBadges eligibility={[row({})]} />);
    const card = screen.getByLabelText("Selling MLB VIP: +12.3u over last 30 days (41 picks)");
    expect(card).toHaveTextContent("MLB");
    expect(card).toHaveTextContent("Selling");
    expect(screen.getByText("+12.3u")).toHaveClass("text-[var(--color-pos)]");
    expect(screen.getByText("41 picks · last 30 days")).toBeInTheDocument();
  });

  it("closed card: exact sentence as aria-label, OFF chip, neg units, reason line", () => {
    render(
      <EligibilityBadges
        eligibility={[
          row({
            sport: "NBA",
            eligible: false,
            units: -3.25,
            n_picks: 12,
            n_floor_picks: 12,
            reason: "below_floor",
          }),
        ]}
      />,
    );
    const card = screen.getByLabelText("Not currently selling: -3.3u NBA, last 30 days");
    expect(card).toHaveTextContent("Off");
    expect(screen.getByText("-3.3u")).toHaveClass("text-[var(--color-neg)]");
    expect(screen.getByText("12 picks · last 30 days")).toBeInTheDocument();
    expect(screen.getByText("Under the 20 pick floor")).toBeInTheDocument();
    expect(screen.getByText("8 more picks to qualify")).toBeInTheDocument();
  });

  it("eligible card wears the purple top border and chip", () => {
    render(<EligibilityBadges eligibility={[row({})]} />);
    const card = screen.getByLabelText("Selling MLB VIP: +12.3u over last 30 days (41 picks)");
    expect(card).toHaveClass("border-t-[var(--color-vip)]");
    expect(screen.getByText("Selling")).toHaveClass("text-[var(--color-vip-text)]");
  });

  it("negative reason copy", () => {
    render(<EligibilityBadges eligibility={[row({ eligible: false, units: -11.4, reason: "negative" })]} />);
    expect(screen.getByText("Negative over 30 days")).toBeInTheDocument();
    expect(screen.getByText("11.4u from eligible")).toBeInTheDocument();
  });

  it("grace night on an eligible sport", () => {
    render(<EligibilityBadges eligibility={[row({ fail_streak: 1 })]} />);
    expect(screen.getByText("One bad night, still selling")).toBeInTheDocument();
  });

  it("no history row renders a muted 0.0u and No record yet once", () => {
    render(
      <EligibilityBadges
        eligibility={[row({ eligible: false, units: null, n_picks: null, reason: "no_record" })]}
      />,
    );
    expect(screen.getByText("0.0u")).toHaveClass("text-[var(--color-text-muted)]");
    expect(screen.getAllByText("No record yet")).toHaveLength(1);
    expect(screen.getByText("No picks in the last 30 days")).toBeInTheDocument();
  });

  it("renders nothing with no rows", () => {
    const { container } = render(<EligibilityBadges eligibility={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
