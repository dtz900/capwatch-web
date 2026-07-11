import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarketRankings } from "@/components/my-tails/MarketRankings";
import type { RankedEdgeRow } from "@/lib/marketRankings";

const authState = {
  session: { user: { id: "user-1" } } as { user: { id: string } } | null,
  entitlements: { isVip: true, isLoggedIn: true },
};
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => authState }));
vi.mock("@/components/capper/MarketTailToggle", () => ({
  MarketTailToggle: ({ market }: { market: string }) => <span>TAIL:{market}</span>,
}));

const base: RankedEdgeRow = {
  capper_id: 1,
  handle: "robd",
  display_name: "Rob",
  market: "HRR",
  n_decided: 107,
  roi_pct: 6.6,
  xroi_pct: 6.63,
  clv_beat_pct: null,
  clv_avg_cents: null,
  clv_n: 0,
  tracked_days: 60,
  gate_pass: true,
  gate_reasons: [],
  originator: false,
  tail_at_close_roi: null,
  x_n: 107,
};
const rows: RankedEdgeRow[] = [
  base,
  {
    ...base,
    capper_id: 2,
    handle: "swampy",
    display_name: "Swampy",
    market: "ML",
    n_decided: 418,
    roi_pct: 7.3,
    xroi_pct: null,
    x_n: 0,
    clv_beat_pct: 22.8,
    clv_n: 408,
    gate_pass: false,
    gate_reasons: ["CLV negative: record looks like variance, not edge"],
    tail_at_close_roi: 7.8,
  },
];

beforeEach(() => {
  authState.entitlements = { isVip: true, isLoggedIn: true };
});
afterEach(() => vi.clearAllMocks());

describe("MarketRankings", () => {
  it("shows the teaser and no data to non-VIPs", () => {
    render(<MarketRankings rows={[]} vip={false} />);
    expect(screen.getByText(/market rankings/i)).toBeInTheDocument();
    expect(screen.getByText(/upgrade to vip/i)).toBeInTheDocument();
    expect(screen.queryByText("robd")).not.toBeInTheDocument();
  });

  it("routes the logged-out teaser to sign in", () => {
    authState.entitlements = { isVip: false, isLoggedIn: false };
    render(<MarketRankings rows={[]} vip={false} />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it("digest shows only tailable pairs, ranked, with verdict word and tail control", () => {
    render(<MarketRankings rows={rows} vip={true} />);
    expect(screen.getByText("robd")).toBeInTheDocument();
    expect(screen.getByText(/real edge/i)).toBeInTheDocument();
    expect(screen.getByText("+6.6%")).toBeInTheDocument();
    expect(screen.getByText(/by closing odds/i)).toBeInTheDocument();
    expect(screen.getByText("TAIL:HRR")).toBeInTheDocument();
    expect(screen.queryByText("swampy")).not.toBeInTheDocument();
  });

  it("market chip drill-in includes failers with their verdicts", () => {
    render(<MarketRankings rows={rows} vip={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Moneyline" }));
    expect(screen.getByText("swampy")).toBeInTheDocument();
    expect(screen.getByText(/variance/i)).toBeInTheDocument();
    expect(screen.getByText("+7.8%")).toBeInTheDocument();
    expect(screen.getByText(/tailing at close/i)).toBeInTheDocument();
    expect(screen.getByText(/\+7\.3% actual/)).toBeInTheDocument();
    expect(screen.queryByText("robd")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Best available" }));
    expect(screen.getByText("robd")).toBeInTheDocument();
  });

  it("renders a quiet unavailable line for VIPs when rows are empty", () => {
    render(<MarketRankings rows={[]} vip={true} />);
    expect(screen.getByText(/rankings are being computed/i)).toBeInTheDocument();
  });
});
