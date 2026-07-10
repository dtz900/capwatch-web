import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { VipEdgesPanel } from "@/components/capper/VipEdgesPanel";

const edgeRows = [
  {
    market: "ML", n_decided: 60, roi_pct: 13.7, xroi_pct: null,
    clv_beat_pct: 66, clv_avg_cents: 80, clv_n: 60, tracked_days: 80,
    gate_pass: true, gate_reasons: [], originator: false,
    tail_at_close_roi: null, pnl_units: 9.0, x_actual_pnl_units: null,
    x_pnl_units: null, x_n: 0, roi_30d: 10.0, xroi_30d: null, n_30d: 15,
    x_n_30d: 0, median_lead_minutes: 50,
  },
  {
    market: "Game Total", n_decided: 40, roi_pct: -11.3, xroi_pct: -11.2,
    clv_beat_pct: 48, clv_avg_cents: -76, clv_n: 20, tracked_days: 80,
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

const authState = {
  session: { user: { id: "user-1" } } as { user: { id: string } } | null,
  entitlements: { isVip: true, isLoggedIn: true },
};
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => authState }));

vi.mock("@/components/capper/MarketTailToggle", () => ({
  MarketTailToggle: () => <span>TAIL</span>,
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  authState.entitlements = { isVip: true, isLoggedIn: true };
});
afterEach(() => vi.clearAllMocks());

async function openDossier() {
  render(<VipEdgesPanel capperId={7} handle="tester" />);
  await waitFor(() =>
    expect(screen.getByText(/click to open the file/i)).toBeInTheDocument()
  );
  fireEvent.click(screen.getByText(/click to open the file/i).closest("button")!);
  await waitFor(() =>
    expect(screen.getAllByText("Moneyline").length).toBeGreaterThanOrEqual(1)
  );
}

describe("VipEdgesPanel dossier", () => {
  it("opens the folder into the report with KPIs, chart and stamps", async () => {
    await openDossier();
    // letterhead + real edge stamp (ML holds up)
    expect(screen.getAllByText(/scout report/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1 real edge/i)).toBeInTheDocument();
    // luck KPI: only Game Total is de-luckable
    expect(screen.getByText("-2.4u")).toBeInTheDocument();
    expect(screen.getByText(/ran cold 1\.8u/i)).toBeInTheDocument();
    // honesty KPI: weighted (80*60 + -76*20) / 80 = 41 bps -> +0.4%
    expect(screen.getByText("+0.4%")).toBeInTheDocument();
    expect(screen.getByText(/beats close 66%/i)).toBeInTheDocument();
    // tailability: (50*60 + 18*40) / 100 = 37.2 min
    expect(screen.getByText("37 min")).toBeInTheDocument();
    // verdict stamps in the table
    expect(screen.getByText(/^real edge$/i)).toBeInTheDocument();
  });

  it("expands a market row into the labeled cell grid", async () => {
    await openDossier();
    expect(screen.queryByText(/last 30d/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /details for game total/i }));
    await waitFor(() =>
      expect(screen.getByText(/-8\.1% last 30d/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/ran cold by 1\.8u/i)).toBeInTheDocument();
    expect(screen.getByText(/-0\.8% vs close/i)).toBeInTheDocument();
    expect(screen.getByText(/18 min pre-pitch/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /details for game total/i }));
    expect(screen.queryByText(/last 30d/i)).not.toBeInTheDocument();
  });

  it("shows a sealed folder to free accounts and nothing when logged out", async () => {
    authState.entitlements = { isVip: false, isLoggedIn: true };
    const { unmount } = render(
      <VipEdgesPanel capperId={7} handle="tester" />
    );
    expect(screen.getByText(/vip members only/i)).toBeInTheDocument();
    expect(screen.getByText(/sealed/i)).toBeInTheDocument();
    expect(screen.queryByText(/click to open the file/i)).not.toBeInTheDocument();
    unmount();

    authState.entitlements = { isVip: false, isLoggedIn: false };
    const { container } = render(
      <VipEdgesPanel capperId={7} handle="tester" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
