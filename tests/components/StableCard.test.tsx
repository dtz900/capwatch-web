// tests/components/StableCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StableCard } from "@/components/my-tails/StableCard";
import { BetSlipProvider } from "@/components/my-tails/BetSlipContext";
import type { CapperRow, TodayPickEntry } from "@/lib/types";

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "x" } }) }) }),
    }),
  }),
}));
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "u1" } }, entitlements: { isVip: true } }),
}));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<object>()),
  fetchPickOutcomes: async () => ({}),
}));

const capper = {
  capper_id: 2,
  handle: "sbr_bets",
  display_name: "SBR",
  profile_image_url: null,
  units_profit: 76.3,
  roi_pct: 18.5,
  win_rate: 0.46,
  picks_count: 198,
  current_day_streak: -2,
  trajectory_units: [0, 1.5, 3.1, 2.2, 4.4],
  last_picks: [
    { kind: "straight", market: "total", selection: "Over", outcome: "W", posted_at: "2026-07-07T00:00:00Z" },
    { kind: "straight", market: "ML", selection: "DET", outcome: "L", posted_at: "2026-07-06T00:00:00Z" },
  ],
  live_picks_count: 1,
} as unknown as CapperRow;

const sample = capper;

const straightPick: TodayPickEntry = {
  capper_id: 2,
  handle: "sbr_bets",
  display_name: "SBR",
  profile_image_url: null,
  kind: "straight",
  matchup: "NYY @ BOS",
  market: "ML",
  market_group: "ML",
  selection: "NYY",
  line: null,
  odds_taken: -110,
  posted_at: "2026-07-09T12:00:00Z",
  outcome: null,
  profit_units: null,
  pick_id: 9001,
};

const parlayPick: TodayPickEntry = {
  capper_id: 2,
  handle: "sbr_bets",
  display_name: "SBR",
  profile_image_url: null,
  kind: "parlay",
  matchup: null,
  market: null,
  market_group: null,
  selection: "3-leg parlay",
  line: null,
  odds_taken: null,
  posted_at: "2026-07-09T12:00:00Z",
  outcome: null,
  profit_units: null,
  pick_id: null,
};

describe("StableCard", () => {
  it("renders name, focal units, supporting line and links to the profile", () => {
    render(<StableCard capper={capper} onUntail={() => {}} />);
    expect(screen.getByText("SBR")).toBeInTheDocument();
    expect(screen.getByText("+76.3")).toBeInTheDocument();
    expect(screen.getByText(/18\.5% ROI/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/cappers/sbr_bets");
  });

  it("fires onUntail from the corner control", () => {
    const spy = vi.fn();
    render(<StableCard capper={capper} onUntail={spy} />);
    fireEvent.click(screen.getByRole("button", { name: /untail/i }));
    expect(spy).toHaveBeenCalled();
  });

  it("renders scoped rows with ROI only, no de-luck machinery", () => {
    const stat = { market: "HRR", n_decided: 90, roi_pct: 13.4 };
    render(
      <StableCard
        capper={capper}
        onUntail={() => {}}
        scopes={["HRR"]}
        scopeStats={[stat]}
        onUntailMarket={() => {}}
      />
    );
    expect(screen.getByText(/Hits \+ Runs \+ RBIs only/)).toBeInTheDocument();
    expect(screen.getByText("+13.4%")).toBeInTheDocument();
    expect(screen.getByText(/90 picks/)).toBeInTheDocument();
    // VIP inventory must not leak onto the free stable card
    expect(screen.queryByText(/real edge/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/luck/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/closing odds/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Net profit")).not.toBeInTheDocument();
  });

  it("fires onUntailMarket from the scope row control", () => {
    const spy = vi.fn();
    const stat = { market: "HRR", n_decided: 90, roi_pct: 13.4 };
    render(
      <StableCard capper={capper} onUntail={() => {}} scopes={["HRR"]}
        scopeStats={[stat]} onUntailMarket={spy} />
    );
    fireEvent.click(screen.getByRole("button", { name: /untail hits \+ runs \+ rbis/i }));
    expect(spy).toHaveBeenCalledWith("HRR");
  });
});

it("straight rows show the add-to-slip affordance inside the provider", async () => {
  render(
    <BetSlipProvider todayDate="2026-07-09">
      <StableCard capper={sample} onUntail={() => {}} todayPicks={[straightPick]} />
    </BetSlipProvider>
  );
  expect(
    await screen.findByLabelText(`Add ${straightPick.selection} to bet slip`)
  ).toBeInTheDocument();
});

it("parlay rows and provider-less renders show no affordance", () => {
  const { rerender } = render(
    <BetSlipProvider todayDate="2026-07-09">
      <StableCard capper={sample} onUntail={() => {}} todayPicks={[parlayPick]} />
    </BetSlipProvider>
  );
  expect(screen.queryByLabelText(/to bet slip/)).not.toBeInTheDocument();
  rerender(<StableCard capper={sample} onUntail={() => {}} todayPicks={[straightPick]} />);
  expect(screen.queryByLabelText(/to bet slip/)).not.toBeInTheDocument();
});
