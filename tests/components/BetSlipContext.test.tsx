import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BetSlipProvider, useBetSlip } from "@/components/my-tails/BetSlipContext";
import type { TodayPickEntry } from "@/lib/types";

const mockRows = [
  { id: 5, pick_id: 9001, stake: 1, odds: 142, capper_id: 69,
    capper_handle: "tonestakes", matchup: "PHI @ CIN", market: "ML",
    selection: "Reds ML", line: null, game_date: "2026-07-09",
    created_at: "2026-07-09T16:05:00Z" },
];

const insertSingle = vi.fn().mockResolvedValue({
  data: { ...mockRows[0], id: 6, pick_id: 9002, selection: "Tigers ML" }, error: null,
});
const supabaseMock = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockRows, error: null })),
      })),
    })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) })),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) })),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) })),
  })),
};

vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => supabaseMock }));

let isVip = true;
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1" } },
    entitlements: { isVip },
  }),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchPickOutcomes: vi.fn().mockResolvedValue({
    9001: { outcome: "W", graded_at: "2026-07-09T05:00:00Z" },
  }),
}));

const pick: TodayPickEntry = {
  capper_id: 4, handle: "swampy_swami", display_name: "SWAMPTHING",
  profile_image_url: null, kind: "straight", matchup: "ATH @ DET",
  market: "ML", market_group: "ML", selection: "Tigers ML", line: null,
  odds_taken: -131, posted_at: "2026-07-09T17:00:00Z", outcome: null,
  profit_units: null, pick_id: 9002,
};

function Probe() {
  const slip = useBetSlip();
  if (!slip) return <div>no provider</div>;
  return (
    <div>
      <div data-testid="count">{slip.entries?.length ?? "loading"}</div>
      <div data-testid="in-slip">{String(slip.inSlip(9001))}</div>
      <div data-testid="all-time">{slip.totals.allTime.toFixed(2)}</div>
      <div data-testid="teaser">{String(slip.teaserOpen)}</div>
      <button onClick={() => slip.addFromPick(pick)}>add</button>
    </div>
  );
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});
afterEach(() => vi.clearAllMocks());

describe("BetSlipProvider", () => {
  it("loads rows, joins outcomes, computes totals", async () => {
    render(<BetSlipProvider todayDate="2026-07-09"><Probe /></BetSlipProvider>);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
    expect(screen.getByTestId("in-slip")).toHaveTextContent("true");
    // W at +142, 1u: profit +1.42
    expect(screen.getByTestId("all-time")).toHaveTextContent("1.42");
  });

  it("adds a pick optimistically for a VIP", async () => {
    render(<BetSlipProvider todayDate="2026-07-09"><Probe /></BetSlipProvider>);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
    fireEvent.click(screen.getByText("add"));
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));
    expect(insertSingle).toHaveBeenCalled();
  });

  it("opens the teaser instead of inserting for a free user", async () => {
    isVip = false;
    render(<BetSlipProvider todayDate="2026-07-09"><Probe /></BetSlipProvider>);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
    fireEvent.click(screen.getByText("add"));
    await waitFor(() => expect(screen.getByTestId("teaser")).toHaveTextContent("true"));
    expect(insertSingle).not.toHaveBeenCalled();
    isVip = true;
  });

  it("returns null outside the provider", () => {
    render(<Probe />);
    expect(screen.getByText("no provider")).toBeInTheDocument();
  });
});
