import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { VipEdgesPanel } from "@/components/capper/VipEdgesPanel";

const edgeRows = [
  {
    market: "ML", n_decided: 60, roi_pct: 13.7, xroi_pct: null,
    clv_beat_pct: 66, clv_avg_cents: 8, clv_n: 60, tracked_days: 80,
    gate_pass: true, gate_reasons: [], originator: false,
    tail_at_close_roi: null, pnl_units: 9.0, x_actual_pnl_units: null,
    x_pnl_units: null, x_n: 0, roi_30d: 10.0, xroi_30d: null, n_30d: 15,
    x_n_30d: 0, median_lead_minutes: 50,
  },
  {
    market: "Game Total", n_decided: 40, roi_pct: -11.3, xroi_pct: -11.2,
    clv_beat_pct: 48, clv_avg_cents: 4, clv_n: 20, tracked_days: 80,
    gate_pass: false, gate_reasons: ["de-lucked xROI not positive"],
    originator: false, tail_at_close_roi: null, pnl_units: -2.4,
    x_actual_pnl_units: -2.4, x_pnl_units: -0.6, x_n: 40, roi_30d: -8.0,
    xroi_30d: -8.1, n_30d: 12, x_n_30d: 12, median_lead_minutes: 18,
  },
];

const supabaseMock = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: edgeRows, error: null })),
      })),
    })),
  })),
};

vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => supabaseMock }));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1" } },
    entitlements: { isVip: true, isLoggedIn: true },
  }),
}));

vi.mock("@/components/capper/MarketTailToggle", () => ({
  MarketTailToggle: () => <span>TAIL</span>,
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});
afterEach(() => vi.clearAllMocks());

describe("VipEdgesPanel depth", () => {
  it("renders the headline strip tiles from the edge rows", async () => {
    render(<VipEdgesPanel capperId={7} clv={{ beatPct: 0.61, avg: 6, n: 80 }} />);
    await waitFor(() => expect(screen.getByText("Moneyline")).toBeInTheDocument());
    // luck tile: only the Game Total row is de-luckable (ML has no x data)
    expect(screen.getAllByText(/skill vs\. luck/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("-2.4u")).toBeInTheDocument();
    expect(
      screen.getByText(/-0\.6u expected on 40 straights, ran/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/cold by 1\.8u/i)).toBeInTheDocument();
    // honesty tile: (8*60 + 4*20) / 80 = 7c, not flagged, server beat pct
    expect(screen.getByText("+7c")).toBeInTheDocument();
    expect(screen.getByText(/beats the close 61% · 80 priced picks/i)).toBeInTheDocument();
    // tailability tile: (50*60 + 18*40) / 100 = 37.2 min
    expect(screen.getByText("37 min")).toBeInTheDocument();
    expect(screen.getByText(/price honesty/i)).toBeInTheDocument();
    expect(screen.getByText(/tailability/i)).toBeInTheDocument();
  });

  it("expands a market row into the labeled cell grid", async () => {
    render(<VipEdgesPanel capperId={7} clv={{ beatPct: 0.61, avg: 6, n: 80 }} />);
    await waitFor(() => expect(screen.getByText("Game Total")).toBeInTheDocument());
    // collapsed: no expansion cells yet (the 30d trend only lives there)
    expect(screen.queryByText(/last 30d/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /details for game total/i }));
    await waitFor(() =>
      expect(screen.getByText(/-8\.1% last 30d/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/ran cold by 1\.8u/i)).toBeInTheDocument();
    expect(screen.getByText(/\+4c vs close/i)).toBeInTheDocument();
    expect(screen.getByText(/beats the close 48% of 20/i)).toBeInTheDocument();
    expect(screen.getByText(/18 min pre-pitch/i)).toBeInTheDocument();
    // collapse again
    fireEvent.click(screen.getByRole("button", { name: /details for game total/i }));
    expect(screen.queryByText(/last 30d/i)).not.toBeInTheDocument();
  });
});
