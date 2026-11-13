// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlreadyLive } from "./AlreadyLive";
import type { ReviewRow } from "./reviewRow";

const twin = {
  pick_id: 121563,
  raw_id: 1,
  selection: "Saint Joes +6.5",
  line: 6.5,
  odds_taken: null,
  units: 1,
  posted_at: "2026-11-11T19:48:40+00:00",
  tweet_id: "1",
  tweet_url: "https://x.com/sexualslips/status/1",
  differs_in_units: true,
  differs_in_price: true,
  this_units: 1.12,
  this_odds: -112,
  posted_label: "Nov 11, 11:48 AM",
};
const pick = (live_twin: ReviewRow["live_twin"]) =>
  ({ pick_id: 121564, capper_handle: "sexualslips", odds_taken: -112, units: 1.12, live_twin }) as unknown as ReviewRow;

describe("AlreadyLive", () => {
  it("renders nothing without a live twin", () => {
    const { container } = render(<AlreadyLive p={pick(null)} canApprove pending={false} onApproveAnyway={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("shows the live pick, both values and a tweet link that opens a new tab", () => {
    render(<AlreadyLive p={pick(twin)} canApprove pending={false} onApproveAnyway={() => {}} />);
    expect(screen.getByText(/already has this pick live as #121563/)).toBeInTheDocument();
    expect(screen.getByText("-112")).toBeInTheDocument();
    expect(screen.getByText("no odds")).toBeInTheDocument();
    expect(screen.getByText("1.12u")).toBeInTheDocument();
    expect(screen.getByText(/The price and stake differ. This may be a deliberate second bet./)).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://x.com/sexualslips/status/1");
    expect(link).toHaveAttribute("target", "_blank");
  });
  it("the second bet button is its own click", () => {
    const fn = vi.fn();
    render(<AlreadyLive p={pick(twin)} canApprove pending={false} onApproveAnyway={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve as a second bet" }));
    expect(fn).toHaveBeenCalledWith(121564);
  });
  it("omits the comparison when nothing differs", () => {
    render(
      <AlreadyLive
        p={pick({ ...twin, odds_taken: -112, units: 1.12, differs_in_units: false, differs_in_price: false })}
        canApprove
        pending={false}
        onApproveAnyway={() => {}}
      />,
    );
    expect(screen.queryByText(/deliberate second bet/)).toBeNull();
  });

  it("editing units to match the live pick removes the stake row and the sentence about it", () => {
    const t = { ...twin, odds_taken: -112, units: 1, differs_in_price: false, differs_in_units: true };
    const { rerender } = render(<AlreadyLive p={pick(t)} canApprove pending={false} onApproveAnyway={() => {}} />);
    expect(screen.getByText("Stake")).toBeInTheDocument();
    expect(screen.getByText(/The stake differs/)).toBeInTheDocument();
    const edited = { ...pick(t), units: 1.0, odds_taken: -112 } as ReviewRow;
    rerender(<AlreadyLive p={edited} canApprove pending={false} onApproveAnyway={() => {}} />);
    expect(screen.queryByText("Stake")).toBeNull();
    expect(screen.queryByText(/deliberate second bet/)).toBeNull();
  });
  it("editing odds to differ adds the price row", () => {
    const t = { ...twin, odds_taken: -110, units: 1.12, differs_in_price: false, differs_in_units: false };
    const { rerender } = render(<AlreadyLive p={{ ...pick(t), odds_taken: -110, units: 1.12 } as ReviewRow} canApprove pending={false} onApproveAnyway={() => {}} />);
    expect(screen.queryByText("Price")).toBeNull();
    rerender(<AlreadyLive p={{ ...pick(t), odds_taken: -125, units: 1.12 } as ReviewRow} canApprove pending={false} onApproveAnyway={() => {}} />);
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("-125")).toBeInTheDocument();
    expect(screen.getByText(/The price differs/)).toBeInTheDocument();
  });
});
