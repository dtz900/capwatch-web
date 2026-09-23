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
import { fetchTodayPicks, fetchTofBoard, fetchTofHand } from "@/lib/api";
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
  sessionStorage.clear();
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
    expect(screen.getByText("No games today.")).toBeInTheDocument();
    expect(screen.getByText("Next deck Wed Sep 23 at 11:00 AM PT")).toBeInTheDocument();
  });

  it("knows weekend decks drop at 9 AM PT and uses the API's time when it has one", () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false, isVip: false } };
    const { unmount } = render(<TofHero initial={{ hand: null, no_hand_reason: "fewer than 3 cards", next_deal: { date: "2026-09-26", expected_at: null } }} />);
    expect(screen.getByText("Not enough picks for a hand today.")).toBeInTheDocument();
    expect(screen.getByText("Next deck Sat Sep 26 at 9:00 AM PT")).toBeInTheDocument();
    unmount();
    render(<TofHero initial={{ hand: null, no_hand_reason: "no games after the drop", next_deal: { date: "2026-09-27", expected_at: "2026-09-27T09:00:00-07:00" } }} />);
    expect(screen.getByText("Only early games today, so nothing to deal.")).toBeInTheDocument();
    expect(screen.getByText("Next deck Sun Sep 27 at 9:00 AM PT")).toBeInTheDocument();
  });

  it("says today when the next deck is later today", () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false, isVip: false } };
    const todayPT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    render(<TofHero initial={{ hand: null, no_hand_reason: "no hand yet", next_deal: { date: todayPT, expected_at: `${todayPT}T11:00:00-07:00` } }} />);
    expect(screen.getByText("Today's deck hasn't dropped yet.")).toBeInTheDocument();
    expect(screen.getByText("Deck drops today at 11:00 AM PT")).toBeInTheDocument();
  });

  it("lets a guest tail without signing in, stashes the play, and moves the deck", async () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false, isVip: false } };
    render(<TofHero initial={HAND} />);
    fireEvent.click(await screen.findByRole("button", { name: /^tail$/i }));
    await screen.findByText(/sign in to keep score/i);
    expect(push).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("ts:tof:guest") ?? "{}")).toEqual({ slateDate: "2026-09-22", choices: [[1, "tail"]] });
    expect(insert).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/you played every card/i)).toBeInTheDocument(), { timeout: 2000 });
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

  it("turns every guest swipe into a real play after login, in deal order, then clears the stash", async () => {
    insert.mockResolvedValue({ error: null });
    localStorage.setItem("ts:tof:guest", JSON.stringify({ slateDate: "2026-09-22", choices: [[2, "fade"], [1, "tail"]] }));
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={TWO_CARDS} />);
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(2));
    expect(insert.mock.calls[0]).toEqual(["tof_plays", { user_id: "u1", hand_id: 7, card_id: 1, stable_pick_id: null, choice: "tail" }]);
    expect(insert.mock.calls[1]).toEqual(["tof_plays", { user_id: "u1", hand_id: 7, card_id: 2, stable_pick_id: null, choice: "fade" }]);
    await waitFor(() => expect(localStorage.getItem("ts:tof:guest")).toBeNull());
    await waitFor(() => expect(screen.getByText(/you played every card/i)).toBeInTheDocument());
  });

  it("asks for a username once, then writes every replayed guest swipe", async () => {
    insert.mockResolvedValue({ error: null });
    localStorage.setItem("ts:tof:guest", JSON.stringify({ slateDate: "2026-09-22", choices: [[1, "tail"], [2, "fade"]] }));
    mockAuth.current = { ...SIGNED_IN, profile: { tier: "free", username: null, username_changed_at: null } };
    render(<TofHero initial={TWO_CARDS} />);
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(2));
    expect(claim.requireUsername).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(localStorage.getItem("ts:tof:guest")).toBeNull());
  });

  it("keeps a played stable pick on the summary after the user unfollowed that capper", async () => {
    selectResult.current = {
      capper_follows: { data: [], error: null },
      tof_plays: { data: [
        { id: 1, hand_id: 7, card_id: 1, stable_pick_id: null, choice: "tail", outcome: "win", units: 0.77 },
        { id: 2, hand_id: 7, card_id: null, stable_pick_id: 904, choice: "tail", outcome: "loss", units: -1 },
      ], error: null },
    };
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    expect(await screen.findByText(/Stable pick/)).toBeInTheDocument();
    expect(fetchTodayPicks).not.toHaveBeenCalled();
    expect(screen.getByLabelText("loss, -1.00u")).toBeInTheDocument();
    expect(screen.getByText("1-1")).toBeInTheDocument();
  });

  it("replays a guest pass too, and never re-inserts a play the user already has", async () => {
    insert.mockResolvedValue({ error: null });
    selectResult.current["tof_plays"] = { data: [{ id: 9, hand_id: 7, card_id: 1, stable_pick_id: null, choice: "tail", outcome: null, units: null }], error: null };
    localStorage.setItem("ts:tof:guest", JSON.stringify({ slateDate: "2026-09-22", choices: [[1, "fade"], [2, "pass"]] }));
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={TWO_CARDS} />);
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(insert.mock.calls[0]).toEqual(["tof_plays", { user_id: "u1", hand_id: 7, card_id: 2, stable_pick_id: null, choice: "pass" }]);
    await waitFor(() => expect(localStorage.getItem("ts:tof:guest")).toBeNull());
  });

  it("ignores guest swipes stashed on a different slate date", async () => {
    insert.mockResolvedValue({ error: null });
    localStorage.setItem("ts:tof:guest", JSON.stringify({ slateDate: "2026-09-21", choices: [[1, "tail"]] }));
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    expect(await screen.findByText("NYY -1.5")).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("ts:tof:guest")).toBeNull());
    expect(insert).not.toHaveBeenCalled();
  });

  it("keeps the stash when the username prompt is dismissed, so the swipes are not lost", async () => {
    insert.mockResolvedValue({ error: null });
    claim.requireUsername.mockResolvedValueOnce(false);
    localStorage.setItem("ts:tof:guest", JSON.stringify({ slateDate: "2026-09-22", choices: [[1, "tail"]] }));
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    await waitFor(() => expect(claim.requireUsername).toHaveBeenCalled());
    expect(insert).not.toHaveBeenCalled();
    expect(localStorage.getItem("ts:tof:guest")).not.toBeNull();
  });

  it("shows graded results on the summary and reads stats from time_window", async () => {
    selectResult.current["tof_plays"] = { data: [{ id: 9, hand_id: 7, card_id: 1, stable_pick_id: null, choice: "tail", outcome: "loss", units: -1 }], error: null };
    selectResult.current["tof_tailer_stats"] = { data: { time_window: "month", plays: 4, wins: 1, losses: 3, pushes: 0, units: "-2.2857", day_streak: -1, best_day_streak: 0 }, error: null };
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    expect(await screen.findByLabelText("loss, -1.00u")).toBeInTheDocument();
    expect(screen.getByText("0-1")).toBeInTheDocument();
    expect(screen.getAllByText("1-3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-2.29u").length).toBeGreaterThan(0);
    expect(screen.getByText("Month")).toBeInTheDocument();
    expect(selectSpy).toHaveBeenCalledWith("tof_tailer_stats", expect.stringContaining("time_window"));
  });

  it("labels the top card Card 1 for a signed-in user even when the seeded shuffle reorders the hand", async () => {
    mockAuth.current = SIGNED_IN;
    const five = handOf([1, 2, 3, 4, 5].map((i) => ({ ...mkCard(i, `T${i} ML`), position: i })));
    render(<TofHero initial={five} />);
    expect(await screen.findByText("Card 1 of 5")).toBeInTheDocument();
  });

  it("re-reads plays and stats when the poll sees the hand flip to graded", async () => {
    vi.useFakeTimers();
    try {
      mockAuth.current = SIGNED_IN;
      render(<TofHero initial={HAND} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      const before = selectSpy.mock.calls.filter((c) => c[0] === "tof_plays").length;
      expect(before).toBeGreaterThan(0);
      vi.mocked(fetchTofHand).mockResolvedValue({ ...HAND, hand: { ...HAND.hand!, status: "graded" } });
      await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      const after = selectSpy.mock.calls.filter((c) => c[0] === "tof_plays").length;
      expect(after).toBeGreaterThan(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps polling after the hand is graded so the next day's deal shows up", async () => {
    vi.useFakeTimers();
    try {
      mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false, isVip: false } };
      render(<TofHero initial={{ ...HAND, hand: { ...HAND.hand!, status: "graded" } }} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
      expect(fetchTofHand).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("re-reads the tailer board when the hand flips to graded", async () => {
    vi.useFakeTimers();
    try {
      mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false, isVip: false } };
      render(<TofHero initial={HAND} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      const before = vi.mocked(fetchTofBoard).mock.calls.length;
      vi.mocked(fetchTofHand).mockResolvedValue({ ...HAND, hand: { ...HAND.hand!, status: "graded" } });
      await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      expect(vi.mocked(fetchTofBoard).mock.calls.length).toBeGreaterThan(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it("pulls the stable card once its game starts while the page is open", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    try {
      const startsSoon = new Date(Date.now() + 20_000).toISOString();
      mockAuth.current = SIGNED_IN;
      selectResult.current = { capper_follows: { data: [{ capper_id: 5, market: "all" }], error: null } };
      vi.mocked(fetchTodayPicks).mockResolvedValue({ date: "2026-09-22", picks: [stablePick({ pick_id: 905, selection: "CHC ML", market: "ML", market_group: "ML", matchup: "CHC @ MIL", commence_time: startsSoon, grading_odds: -120 })] });
      render(<TofHero initial={handOf([mkCard(1, "NYY -1.5", "2000-01-01T00:00:00Z")])} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(50); });
      expect(screen.getByText("CHC ML")).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(45_000); });
      expect(screen.queryByText("CHC ML")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the stable card the user actually played on the summary after it has started and graded", async () => {
    selectResult.current = {
      capper_follows: { data: [{ capper_id: 5, market: "all" }], error: null },
      tof_plays: { data: [
        { id: 1, hand_id: 7, card_id: 1, stable_pick_id: null, choice: "tail", outcome: "win", units: 0.77 },
        { id: 2, hand_id: 7, card_id: null, stable_pick_id: 904, choice: "tail", outcome: "loss", units: -1 },
      ], error: null },
    };
    vi.mocked(fetchTodayPicks).mockResolvedValue({
      date: "2026-09-22",
      picks: [
        stablePick({ pick_id: 904, selection: "PLAYED ONE", grading_odds: -115, commence_time: "2000-01-01T00:00:00Z", outcome: "L" }),
        stablePick({ pick_id: 905, selection: "FRESH ONE", grading_odds: -105, commence_time: "2099-01-01T00:00:00Z" }),
      ],
    });
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={HAND} />);
    expect(await screen.findByText(/PLAYED ONE/)).toBeInTheDocument();
    expect(screen.queryByText(/FRESH ONE/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("loss, -1.00u")).toBeInTheDocument();
    expect(screen.getByText("1-1")).toBeInTheDocument();
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

  it("skips a guest swipe on a card that locked while the user was logging in", async () => {
    insert.mockResolvedValue({ error: null });
    localStorage.setItem("ts:tof:guest", JSON.stringify({ slateDate: "2026-09-22", choices: [[1, "tail"]] }));
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={handOf([mkCard(1, "NYY -1.5", "2000-01-01T00:00:00Z")])} />);
    await waitFor(() => expect(localStorage.getItem("ts:tof:guest")).toBeNull());
    expect(insert).not.toHaveBeenCalled();
  });

  it("remembers a guest's plays across a remount on the same slate", async () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false } };
    const first = render(<TofHero initial={TWO_CARDS} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^tail$/i })); });
    await waitFor(() => expect(screen.getByText("Card 2 of 2")).toBeInTheDocument());
    first.unmount();
    render(<TofHero initial={TWO_CARDS} />);
    await waitFor(() => expect(screen.getByText("Card 2 of 2")).toBeInTheDocument());
  });

  it("carries a guest pass over as a written play on sign-in instead of just hiding the card", async () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false } };
    const guest = render(<TofHero initial={TWO_CARDS} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^pass$/i })); });
    await waitFor(() => expect(screen.getByText("Card 2 of 2")).toBeInTheDocument());
    guest.unmount();
    insert.mockResolvedValue({ error: null });
    mockAuth.current = SIGNED_IN;
    render(<TofHero initial={TWO_CARDS} />);
    await waitFor(() => expect(insert).toHaveBeenCalledWith("tof_plays", { user_id: "u1", hand_id: 7, card_id: 1, stable_pick_id: null, choice: "pass" }));
    // Card 1 is written and off the deck; only BOS ML is left face up.
    await waitFor(() => expect(screen.queryByText("NYY -1.5")).not.toBeInTheDocument());
    expect(screen.getByText("BOS ML")).toBeInTheDocument();
  });

  it("forgets guest plays from a different slate date", async () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false } };
    const first = render(<TofHero initial={TWO_CARDS} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^tail$/i })); });
    await waitFor(() => expect(screen.getByText("Card 2 of 2")).toBeInTheDocument());
    first.unmount();
    const other = { ...TWO_CARDS, hand: { ...TWO_CARDS.hand!, slate_date: "2026-09-23" } };
    render(<TofHero initial={other} />);
    await waitFor(() => expect(screen.getByText("Card 1 of 2")).toBeInTheDocument());
  });

  it("lands folded on every mount, even after being opened", async () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false } };
    const first = render(<TofHero initial={HAND} />);
    const title = screen.getByRole("button", { name: /tail\s*or\s*fade/i });
    expect(title).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(title);
    expect(title).toHaveAttribute("aria-expanded", "true");
    first.unmount();
    render(<TofHero initial={HAND} />);
    expect(screen.getByRole("button", { name: /tail\s*or\s*fade/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("with no server hand, paints the cached hand and then refetches", async () => {
    mockAuth.current = { session: null, profile: null, entitlements: { isLoggedIn: false } };
    sessionStorage.setItem("ts:tof:hand", JSON.stringify({ at: Date.now(), data: HAND }));
    vi.mocked(fetchTofHand).mockResolvedValue(TWO_CARDS);
    render(<TofHero initial={null} />);
    await waitFor(() => expect(screen.getByText("Card 1 of 2")).toBeInTheDocument());
    expect(fetchTofHand).toHaveBeenCalledTimes(1);
  });
});
