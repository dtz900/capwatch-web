import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { VipEdgesPanel } from "@/components/capper/VipEdgesPanel";

const edgeRows = [
  {
    market: "ML", n_decided: 60, roi_pct: 13.7, xroi_pct: null,
    clv_beat_pct: 66, clv_avg_cents: 8, clv_n: 60, tracked_days: 80,
    gate_pass: true, gate_reasons: [], originator: false,
    tail_at_close_roi: null, pnl_units: 9.0, x_actual_pnl_units: 9.0,
    x_pnl_units: 3.0, roi_30d: 10.0, xroi_30d: 6.0, n_30d: 15, x_n_30d: 15,
    median_lead_minutes: 50,
  },
  {
    market: "Game Total", n_decided: 40, roi_pct: -11.3, xroi_pct: -11.2,
    clv_beat_pct: 48, clv_avg_cents: 4, clv_n: 20, tracked_days: 80,
    gate_pass: false, gate_reasons: ["de-lucked xROI not positive"],
    originator: false, tail_at_close_roi: null, pnl_units: -2.4,
    x_actual_pnl_units: -2.4, x_pnl_units: -0.6, roi_30d: -8.0,
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
  it("renders the headline strip from the edge rows", async () => {
    render(<VipEdgesPanel capperId={7} clv={{ beatPct: 0.61, avg: 6, n: 80 }} />);
    await waitFor(() => expect(screen.getByText("Moneyline")).toBeInTheDocument());
    // luck strip: net 6.6, expected 2.4, delta +4.2 ran hot
    expect(screen.getByText(/skill vs\. luck/i)).toBeInTheDocument();
    expect(screen.getByText(/\+2\.4u expected/i)).toBeInTheDocument();
    expect(screen.getByText(/ran hot \+4\.2u/i)).toBeInTheDocument();
    expect(screen.getByText(/price honesty/i)).toBeInTheDocument();
    expect(screen.getByText(/tailability/i)).toBeInTheDocument();
    // typical lead: (50*60 + 18*40) / 100 = 37.2 -> ~37 min
    expect(screen.getByText(/~37 min before first pitch/i)).toBeInTheDocument();
  });

  it("expands a market row to show the verdict sentence and depth lines", async () => {
    render(<VipEdgesPanel capperId={7} clv={{ beatPct: 0.61, avg: 6, n: 80 }} />);
    await waitFor(() => expect(screen.getByText("Game Total")).toBeInTheDocument());
    // collapsed: no detail lines yet
    expect(screen.queryByText(/ran cold by 1\.8u/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /details for game total/i }));
    // verdict sentence (LUCK SO FAR path is not this row; this one is losing/unlucky family)
    await waitFor(() =>
      expect(screen.getByText(/ran cold by 1\.8u/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/last 30d xroi -8\.1%/i)).toBeInTheDocument();
    expect(screen.getByText(/beats the close 48%/i)).toBeInTheDocument();
    expect(screen.getByText(/~18 min before first pitch/i)).toBeInTheDocument();
    // collapse again
    fireEvent.click(screen.getByRole("button", { name: /details for game total/i }));
    expect(screen.queryByText(/ran cold by 1\.8u/i)).not.toBeInTheDocument();
  });
});
