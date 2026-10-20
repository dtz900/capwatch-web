import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SlateGame, SlateResponse } from "@/lib/types";

const deadline = vi.fn(<T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> => (void ms, void fallback, p));
const lkg = vi.fn(async () => null as unknown);

vi.mock("@/lib/api", () => ({
  fetchSlate: vi.fn(),
  withDeadline: <T,>(p: Promise<T>, ms: number, fallback: T) => deadline(p, ms, fallback),
}));
vi.mock("@/lib/kv-cache", () => ({
  withKvCache: <T,>(_key: string, _ttl: number, fetcher: () => Promise<T>) => fetcher(),
  readLastKnownGood: () => lkg(),
}));
vi.mock("@/lib/week-standings", () => ({
  currentSlateDay: () => "2026-10-20",
}));

import { fetchSlate } from "@/lib/api";
import { tonightCaption, tonightGameCount } from "@/lib/slate-tonight";
import { fetchTonightCounts } from "@/lib/slate-tonight-fetch";

function game(over: Partial<SlateGame>): SlateGame {
  return {
    game_id: 1,
    away_team: "A",
    home_team: "B",
    away_starter: null,
    home_starter: null,
    game_date: "2026-10-20",
    game_time: null,
    game_state: "scheduled",
    away_score: null,
    home_score: null,
    inning: null,
    inning_half: null,
    outs: null,
    picks: [],
    ...over,
  };
}

function slate(games: SlateGame[]): SlateResponse {
  return {
    date: "2026-10-20",
    games,
    most_picked: [],
    day_summary: { wins: 0, losses: 0, pushes: 0, voids: 0, net_units: 0, graded_count: 0, pending_count: 0 } as SlateResponse["day_summary"],
    capper_summary: [],
  };
}

describe("tonightGameCount", () => {
  it("counts scheduled and live games on a day board, not finals", () => {
    const data = slate([
      game({ game_id: 1, game_state: "scheduled" }),
      game({ game_id: 2, game_state: "in_progress" }),
      game({ game_id: 3, game_state: "final" }),
    ]);
    expect(tonightGameCount(data, "nba", "2026-10-20")).toBe(2);
  });

  it("only counts the NFL week's games that kick off on the slate day", () => {
    const data = slate([
      game({ game_id: 1, game_date: "2026-10-22" }),
      game({ game_id: 2, game_date: "2026-10-25" }),
      game({ game_id: 3, game_date: "2026-10-22", game_state: "final" }),
    ]);
    expect(tonightGameCount(data, "nfl", "2026-10-22")).toBe(1);
    expect(tonightGameCount(data, "nfl", "2026-10-21")).toBe(0);
  });

  it("is zero with no data", () => {
    expect(tonightGameCount(null, "mlb", "2026-10-20")).toBe(0);
  });
});

describe("tonightCaption", () => {
  it("reads as a count under the league label", () => {
    expect(tonightCaption(1)).toBe("1 tonight");
    expect(tonightCaption(9)).toBe("9 tonight");
  });
});

describe("fetchTonightCounts", () => {
  beforeEach(() => {
    vi.mocked(fetchSlate).mockReset();
    deadline.mockImplementation((p) => p);
    lkg.mockResolvedValue(null);
  });

  it("asks for tonight's slate of every league and counts each", async () => {
    vi.mocked(fetchSlate).mockImplementation(async (_date, sport) => {
      if (sport === "nfl") return slate([game({ game_date: "2026-10-20" })]);
      if (sport === "nba") return slate([game({}), game({ game_id: 2 })]);
      return slate([game({ game_state: "final" })]);
    });
    const counts = await fetchTonightCounts();
    expect(counts).toEqual({ nfl: 1, nba: 2, mlb: 0 });
    expect(vi.mocked(fetchSlate).mock.calls.map((c) => c[1]).sort()).toEqual(["mlb", "nba", "nfl"]);
    expect(vi.mocked(fetchSlate).mock.calls.every((c) => c[0] === "today")).toBe(true);
  });

  it("leaves out a league whose slate failed instead of failing the picker", async () => {
    vi.mocked(fetchSlate).mockImplementation(async (_date, sport) => {
      if (sport === "nba") throw new Error("boom");
      return slate([game({})]);
    });
    const counts = await fetchTonightCounts();
    expect(counts).toEqual({ nfl: 1, mlb: 1 });
  });

  it("serves the day's last-known-good counts when the live read misses the deadline", async () => {
    vi.mocked(fetchSlate).mockImplementation(() => new Promise(() => {}));
    deadline.mockImplementation((_p, _ms, fallback) => Promise.resolve(fallback));
    lkg.mockResolvedValue({ nba: 3 });
    expect(await fetchTonightCounts()).toEqual({ nba: 3 });
  });

  it("renders no signal when the live read misses the deadline and nothing is cached", async () => {
    vi.mocked(fetchSlate).mockImplementation(() => new Promise(() => {}));
    deadline.mockImplementation((_p, _ms, fallback) => Promise.resolve(fallback));
    expect(await fetchTonightCounts()).toEqual({});
  });
});
