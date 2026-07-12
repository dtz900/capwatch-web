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
  profile_image_url: null,
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
const swampy: RankedEdgeRow = {
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
};
const rows: RankedEdgeRow[] = [base, swampy];

/* Five non-tailable ML rows: a vacant division with a deep contender list. */
const mlRows: RankedEdgeRow[] = [
  swampy,
  { ...swampy, capper_id: 3, handle: "ml_three", tail_at_close_roi: 5.0 },
  { ...swampy, capper_id: 4, handle: "ml_four", tail_at_close_roi: 4.0 },
  { ...swampy, capper_id: 5, handle: "ml_five", tail_at_close_roi: 3.0 },
  { ...swampy, capper_id: 6, handle: "ml_six", tail_at_close_roi: 2.0 },
];

beforeEach(() => {
  authState.entitlements = { isVip: true, isLoggedIn: true };
});
afterEach(() => vi.clearAllMocks());

describe("MarketRankings market masters", () => {
  it("shows the teaser and no data to non-VIPs", () => {
    render(<MarketRankings rows={[]} vip={false} />);
    expect(screen.getByText("Market Masters")).toBeInTheDocument();
    expect(screen.getByText(/upgrade to vip/i)).toBeInTheDocument();
    expect(screen.queryByText("robd")).not.toBeInTheDocument();
  });

  it("routes the logged-out teaser to sign in", () => {
    authState.entitlements = { isVip: false, isLoggedIn: false };
    render(<MarketRankings rows={[]} vip={false} />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it("crowns the top tailable capper and marks survivor-less markets masterless", () => {
    render(<MarketRankings rows={rows} vip={true} />);
    // HRR market: robd passes the gate and is the master
    expect(screen.getByText(/hits \+ runs \+ rbis/i)).toBeInTheDocument();
    expect(screen.getByText("Market Master")).toBeInTheDocument();
    expect(screen.getByText("robd")).toBeInTheDocument();
    expect(screen.getByText(/real edge/i)).toBeInTheDocument();
    // master shows actual big plus the expected line (same value for robd)
    expect(screen.getAllByText("+6.6%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/expected/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("TAIL:HRR")).toBeInTheDocument();
    // master row links out to the capper's X profile
    expect(screen.getByRole("link", { name: /robd on x/i })).toHaveAttribute(
      "href",
      "https://x.com/robd"
    );
    // ML market: swampy fails the gate, no master, swampy runs as contender
    expect(screen.getByText("Moneyline")).toBeInTheDocument();
    expect(screen.getByText(/no master yet/i)).toBeInTheDocument();
    expect(screen.getByText(/nobody in this market beats the closing line/i)).toBeInTheDocument();
    expect(screen.getByText("swampy")).toBeInTheDocument();
    expect(screen.getByText(/variance/i)).toBeInTheDocument();
    // contender columns: expected (ranked) next to actual
    expect(screen.getByText("Expected")).toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
    expect(screen.getByText("+7.8%")).toBeInTheDocument();
    expect(screen.getByText("+7.3%")).toBeInTheDocument();
    expect(screen.getByText("TAIL:ML")).toBeInTheDocument();
  });

  it("crowns the master on the public verdict even when the gate trips on provenance only", () => {
    const investin: RankedEdgeRow = {
      ...base,
      capper_id: 7,
      handle: "investin",
      market: "Spread",
      roi_pct: 8.66,
      xroi_pct: 9.87,
      x_n: 62,
      gate_pass: false,
      gate_reasons: ["not profitable in both halves"],
    };
    render(<MarketRankings rows={[investin]} vip={true} />);
    expect(screen.getByText("Spread")).toBeInTheDocument();
    expect(screen.getByText("Market Master")).toBeInTheDocument();
    expect(screen.queryByText(/no master yet/i)).not.toBeInTheDocument();
    expect(screen.getByText("investin")).toBeInTheDocument();
    expect(screen.getByText(/real edge/i)).toBeInTheDocument();
  });

  it("collapses contenders to three and expands on demand", () => {
    render(<MarketRankings rows={mlRows} vip={true} />);
    expect(screen.getByText("swampy")).toBeInTheDocument();
    expect(screen.getByText("ml_four")).toBeInTheDocument();
    expect(screen.queryByText("ml_six")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /all 5 contenders/i }));
    expect(screen.getByText("ml_six")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /fewer/i }));
    expect(screen.queryByText("ml_six")).not.toBeInTheDocument();
  });

  it("renders a quiet unavailable line for VIPs when rows are empty", () => {
    render(<MarketRankings rows={[]} vip={true} />);
    expect(screen.getByText(/rankings are being computed/i)).toBeInTheDocument();
  });
});
