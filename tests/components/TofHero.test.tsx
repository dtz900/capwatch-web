import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

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
// Records every .from(table).select(columns) so a test can assert that the
// plays re-read actually ran after a failed insert.
const selectSpy = vi.hoisted(() => vi.fn());
// Per-table select result override, keyed by table name, so a test can force
// a single table's select (e.g. a failed tof_plays load) to resolve with an
// error while every other table keeps the default empty-success shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectResult = vi.hoisted(() => ({ current: {} as Record<string, any> }));
// The hero issues .eq() chains of varying depth against different tables
// (two .eq()s for tof_plays and tof_tailer_stats, a single .eq() for
// capper_follows). Real supabase query builders are thenable at every
// depth, so this stub makes every .eq() call return the same thenable
// chain object rather than modeling one fixed depth.
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    from: (table: string) => ({
      select: (columns: string) => {
        selectSpy(table, columns);
        // The chain mimics a thenable PostgrestFilterBuilder at every .eq()
        // depth; typing it precisely would just re-declare the supabase-js
        // builder.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = {
          eq: () => chain,
          maybeSingle: () => Promise.resolve(selectResult.current[table] ?? { data: null, error: null }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          then: (resolve: any) => resolve(selectResult.current[table] ?? { data: [], error: null }),
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
import { fetchTodayPicks, fetchTofHand } from "@/lib/api";
import type { TodayPickEntry, TofCard, TofHandResponse } from "@/lib/types";

function mkCard(id: number, label: string, startAt = "2099-01-01T00:00:00Z"): TofCard {
  return { id, position: id, category: "heater", handle: "luckyluke", display_name: null, profile_image_url: null,
    capper_streak: 6, capper_record: null, sport: "MLB", matchup: "NYY @ BAL", game_start_at: startAt,
    game_state: "scheduled", home_score: null, away_score: null, market_group: "Spread", tail_label: label,
    tail_odds: 130, fade_label: "BAL +1.5", fade_odds_at_deal: -150, fade_odds_source: "pending", note: "n",
    rival: null, field_count: null, tail_outcome: null, fade_outcome: null, tail_units: null, fade_units: null, crowd: null };
}

function handOf(cards: TofCard[]): TofHandResponse {
  return {
    hand: { hand_id: 7, slate_date: "2026-09-22", status: "open", dealt_at: null, first_lock_at: null,
      last_lock_at: null, cards },
    no_hand_reason: null, next_deal: null,
  };
}

const HAND: TofHandResponse = handOf([mkCard(1, "NYY -1.5")]);
const TWO_CARDS: TofHandResponse = handOf([mkCard(1, "NYY -1.5"), mkCard(2, "BOS ML")]);
const SIGNED_IN = {
  session: { user: { id: "u1", email: "d@x.com" } },
  profile: { tier: "free", username: "dt_fades", username_changed_at: null },
  entitlements: { isLoggedIn: true, isVip: false },
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "x");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "y");
  insert.mockReset();
  selectSpy.mockReset();
  push.mockReset();
  claim.requireUsername.mockClear();
  localStorage.clear();
  selectResult.current = {};
  vi.mocked(fetchTodayPicks).mockResolvedValue({ date: "2026-09-22", picks: [] });
  vi.mocked(fetchTofHand).mockReset();
  vi.mocked(fetchTofHand).mockResolvedValue({ hand: null, no_hand_reason: null, next_deal: null });
});

function stablePick(over: Partial<TodayPickEntry>): TodayPickEntry {
  return {
    capper_id: 5, handle: "picksoffice", display_name: null, profile_image_url: null, kind: "straight",
    matchup: "CHC @ MIL", market: "Total", market_group: "Game Total", selection: "Under 8.5", line: 8.5,
    odds_taken: -110, posted_at: null, outcome: null, profit_units: null, pick_id: 900, parlay_id: null,
    ...over,
  };
}

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

  it("surfaces a failed plays load with a toast instead of silently showing an empty deck", async () => {
    selectResult.current = { tof_plays: { data: null, error: { message: "boom" } } };
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      profile: { tier: "free", username: "dt_fades", username_changed_at: null },
      entitlements: { isLoggedIn: true, isVip: false },
    };
    render(<TofHero initial={HAND} />);
    expect(await screen.findByText(/could not load your plays/i)).toBeInTheDocument();
  });

  it("advances the deck when an anonymous user passes, and ends on the played-out state", async () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false, isVip: false } };
    render(<TofHero initial={TWO_CARDS} />);
    expect(await screen.findByText("NYY -1.5")).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^pass$/i })); });
    expect(await screen.findByText("BOS ML")).toBeInTheDocument();
    expect(screen.queryByText("NYY -1.5")).not.toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^pass$/i })); });
    expect(await screen.findByText("You played every card.")).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it("maps a duplicate insert to Already played and re-reads the plays", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key value violates unique constraint" } });
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    const before = selectSpy.mock.calls.filter((c) => c[0] === "tof_plays").length;
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^tail$/i })); });
    expect(await screen.findByText("Already played.")).toBeInTheDocument();
    await waitFor(() => expect(selectSpy.mock.calls.filter((c) => c[0] === "tof_plays").length).toBeGreaterThan(before));
  });

  it("maps an RLS rejection to That card just locked", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "new row violates row-level security policy" } });
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^tail$/i })); });
    expect(await screen.findByText("That card just locked.")).toBeInTheDocument();
  });

  it("falls back to the generic copy for any other insert error", async () => {
    insert.mockResolvedValue({ error: { code: "08006", message: "connection failure" } });
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^tail$/i })); });
    expect(await screen.findByText("Could not save that play. Try again.")).toBeInTheDocument();
  });

  it("replays a stashed pending play once after login", async () => {
    insert.mockResolvedValue({ error: null });
    localStorage.setItem("ts:tof:pending", JSON.stringify({ cardId: 1, choice: "tail", slateDate: "2026-09-22" }));
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    await waitFor(() => expect(insert).toHaveBeenCalledWith("tof_plays",
      { user_id: "u1", hand_id: 7, card_id: 1, stable_pick_id: null, choice: "tail" }));
    expect(insert).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("ts:tof:pending")).toBeNull();
  });

  it("ignores a pending play stashed on a different slate date", async () => {
    insert.mockResolvedValue({ error: null });
    localStorage.setItem("ts:tof:pending", JSON.stringify({ cardId: 1, choice: "tail", slateDate: "2026-09-21" }));
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    expect(await screen.findByText("NYY -1.5")).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("ts:tof:pending")).toBeNull());
    expect(insert).not.toHaveBeenCalled();
  });

  it("offers a stable card at its grading odds and skips graded, unpriced, and started picks", async () => {
    selectResult.current = { capper_follows: { data: [{ capper_id: 5, market: "all" }], error: null } };
    vi.mocked(fetchTodayPicks).mockResolvedValue({
      date: "2026-09-22",
      picks: [
        stablePick({ pick_id: 901, selection: "GRADED ONE", outcome: "W" }),
        stablePick({ pick_id: 902, selection: "UNPRICED ONE", odds_taken: null, grading_odds: null }),
        stablePick({ pick_id: 903, selection: "STARTED ONE", commence_time: "2000-01-01T00:00:00Z" }),
        stablePick({ pick_id: 904, selection: "Under 8.5", grading_odds: -115, commence_time: "2099-01-01T00:00:00Z" }),
      ],
    });
    mockAuth.current = SIGNED_IN;
    // The only shared card already started, so the stable card is on top.
    render(<TofHero initial={handOf([mkCard(1, "NYY -1.5", "2000-01-01T00:00:00Z")])} />);

    expect(await screen.findByText("Under 8.5")).toBeInTheDocument();
    // grading_odds wins over odds_taken for the price shown and scored.
    expect(screen.getByText("-115")).toBeInTheDocument();
    expect(screen.queryByText("GRADED ONE")).not.toBeInTheDocument();
    expect(screen.queryByText("UNPRICED ONE")).not.toBeInTheDocument();
    expect(screen.queryByText("STARTED ONE")).not.toBeInTheDocument();
  });

  it("only offers a stable card in a market the user actually tails", async () => {
    selectResult.current = { capper_follows: { data: [{ capper_id: 5, market: "ML" }], error: null } };
    vi.mocked(fetchTodayPicks).mockResolvedValue({
      date: "2026-09-22",
      picks: [
        stablePick({ pick_id: 907, selection: "NYM -1.5", market_group: "Spread", commence_time: "2099-01-01T00:00:00Z" }),
        stablePick({ pick_id: 908, selection: "NYM ML", market_group: "ML", commence_time: "2099-01-01T00:00:00Z" }),
      ],
    });
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={handOf([mkCard(1, "NYY -1.5", "2000-01-01T00:00:00Z")])} />);

    expect(await screen.findByText("NYM ML")).toBeInTheDocument();
    expect(screen.queryByText("NYM -1.5")).not.toBeInTheDocument();
  });

  it("keeps polling for a hand when the deal has not landed yet", async () => {
    vi.useFakeTimers();
    try {
      mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false, isVip: false } };
      render(<TofHero initial={{ hand: null, no_hand_reason: "not dealt yet", next_deal: null }} />);
      expect(fetchTofHand).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
      expect(fetchTofHand).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores a pending play on a card that locked while the user was logging in", async () => {
    insert.mockResolvedValue({ error: null });
    localStorage.setItem("ts:tof:pending", JSON.stringify({ cardId: 1, choice: "tail", slateDate: "2026-09-22" }));
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={handOf([mkCard(1, "NYY -1.5", "2000-01-01T00:00:00Z")])} />);
    await waitFor(() => expect(localStorage.getItem("ts:tof:pending")).toBeNull());
    expect(insert).not.toHaveBeenCalled();
  });
});
