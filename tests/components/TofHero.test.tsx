import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// mockAuth.current takes a different useAuth()-shaped literal per test; same
// pattern as the other component tests that mock AuthProvider (pre-existing
// lint debt).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.hoisted(() => ({ current: {} as any }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => mockAuth.current }));
const claim = vi.hoisted(() => ({ requireUsername: vi.fn().mockResolvedValue(true), openChange: vi.fn() }));
vi.mock("@/components/auth/UsernameClaim", () => ({ useUsernameClaim: () => claim }));
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", () => ({
  fetchTofHand: vi.fn(),
  fetchTofBoard: vi.fn().mockResolvedValue({ window: "month", min_plays: 10, rows: [] }),
  fetchTodayPicks: vi.fn().mockResolvedValue({ date: "2026-09-22", picks: [] }),
}));
const insert = vi.hoisted(() => vi.fn());
// The hero issues .eq() chains of varying depth against different tables
// (two .eq()s for tof_plays and tof_tailer_stats, a single .eq() for
// capper_follows). Real supabase query builders are thenable at every
// depth, so this stub makes every .eq() call return the same thenable
// chain object rather than modeling one fixed depth.
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    from: (table: string) => ({
      select: () => {
        // The chain mimics a thenable PostgrestFilterBuilder at every .eq()
        // depth; typing it precisely would just re-declare the supabase-js
        // builder.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = {
          eq: () => chain,
          maybeSingle: () => Promise.resolve({ data: null }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          then: (resolve: any) => resolve({ data: [], error: null }),
        };
        return chain;
      },
      // row shape varies per insert call (tof_plays only, in this hero).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insert: (row: any) => insert(table, row),
    }),
  }),
}));

import { TofHero } from "@/components/tof/TofHero";
import type { TofHandResponse } from "@/lib/types";

const HAND: TofHandResponse = {
  hand: { hand_id: 7, slate_date: "2026-09-22", status: "open", dealt_at: null, first_lock_at: null, last_lock_at: null,
    cards: [{ id: 1, position: 1, category: "heater", handle: "luckyluke", display_name: null, profile_image_url: null,
      capper_streak: 6, capper_record: null, sport: "MLB", matchup: "NYY @ BAL", game_start_at: "2099-01-01T00:00:00Z",
      game_state: "scheduled", home_score: null, away_score: null, market_group: "Spread", tail_label: "NYY -1.5",
      tail_odds: 130, fade_label: "BAL +1.5", fade_odds_at_deal: -150, fade_odds_source: "pending", note: "n",
      rival: null, field_count: null, tail_outcome: null, fade_outcome: null, tail_units: null, fade_units: null, crowd: null }] },
  no_hand_reason: null, next_deal: null,
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "x");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "y");
  insert.mockReset();
  push.mockReset();
  claim.requireUsername.mockClear();
  localStorage.clear();
});

describe("TofHero", () => {
  it("renders the no-hand state with the next deal", () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false, isVip: false } };
    render(<TofHero initial={{ hand: null, no_hand_reason: "no games today", next_deal: { date: "2026-09-23", expected_at: null } }} />);
    expect(screen.getByText(/no hand today/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-09-23|Sep 23/)).toBeInTheDocument();
  });

  it("sends an anonymous tail to login and stashes the pending play", async () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false, isVip: false } };
    render(<TofHero initial={HAND} />);
    fireEvent.click(await screen.findByRole("button", { name: /^tail$/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(JSON.parse(localStorage.getItem("ts:tof:pending") ?? "{}")).toEqual({ cardId: 1, choice: "tail", slateDate: "2026-09-22" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("writes a play for a signed-in user with a username", async () => {
    insert.mockResolvedValue({ error: null });
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      profile: { tier: "free", username: "dt_fades", username_changed_at: null },
      entitlements: { isLoggedIn: true, isVip: false },
    };
    render(<TofHero initial={HAND} />);
    fireEvent.click(await screen.findByRole("button", { name: /^fade$/i }));
    await waitFor(() => expect(insert).toHaveBeenCalledWith("tof_plays",
      { user_id: "u1", hand_id: 7, card_id: 1, stable_pick_id: null, choice: "fade" }));
    expect(claim.requireUsername).toHaveBeenCalled();
  });
});
