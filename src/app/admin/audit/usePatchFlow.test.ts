// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueueRow } from "./labels";

const patchMock = vi.fn();
vi.mock("./actions", () => ({
  patchPickFieldAction: (...args: unknown[]) => patchMock(...args),
}));

import { usePatchFlow } from "./usePatchFlow";

function row(id: number, over: Partial<QueueRow> = {}): QueueRow {
  return {
    pick_id: id,
    capper_id: 1,
    sport: "MLB",
    capper_handle: "x",
    capper_display_name: null,
    kind: "ungraded",
    reason: "missing_game_id",
    market: "hits",
    selection: "Acuff o4.5",
    line: null,
    odds_taken: null,
    units: null,
    player_id: 7,
    game_id: "99",
    game_date: "2026-11-06",
    parlay_id: null,
    posted_at: null,
    raw_id: 5,
    tweet_text: null,
    tweet_url: null,
    stat_name: "hits",
    player_name: "D. Acuff",
    posted_label: null,
    game_label: null,
    ...over,
  };
}

function setup(rows: QueueRow[], apply = true, selected: number | null = null) {
  return renderHook(
    ({ problems }) =>
      usePatchFlow(problems, apply, selected),
    { initialProps: { problems: rows } },
  );
}

beforeEach(() => patchMock.mockReset());

describe("usePatchFlow", () => {
  it("does not mutate the row when the patch fails", async () => {
    patchMock.mockResolvedValue({ ok: false, error: "500: boom" });
    const { result } = setup([row(1)]);
    await act(async () => {
      await expect(result.current.handlePatch(1, { line: 4.5 }, "Line set to 4.5")).rejects.toThrow("500: boom");
    });
    expect(result.current.rows[0].line).toBeNull();
    expect(result.current.fixed[1]).toBeUndefined();
  });

  it("sport change clears bindings and flags the market until one is picked", async () => {
    patchMock.mockResolvedValue({ ok: true });
    const { result } = setup([row(1)]);
    await act(async () => {
      await result.current.handlePatch(1, { sport: "NBA" }, "Sport set to NBA");
    });
    const r = result.current.rows[0];
    expect(r.sport).toBe("NBA");
    expect(r.game_id).toBeNull();
    expect(r.player_id).toBeNull();
    expect(r.player_name).toBeNull();
    expect(result.current.marketRecheck[1]).toBe("NBA");

    await act(async () => {
      await result.current.handlePatch(1, { line: 4.5 }, "Line set to 4.5");
    });
    expect(result.current.marketRecheck[1]).toBe("NBA");

    await act(async () => {
      await result.current.handlePatch(1, { stat_name: "rebounds", market: "rebounds" }, "Market set");
    });
    expect(result.current.marketRecheck[1]).toBeUndefined();
    expect(result.current.rows[0].stat_name).toBe("rebounds");
  });

  it("propagates to siblings after the primary and surfaces a sibling failure", async () => {
    patchMock.mockImplementation(async (id: number) =>
      id === 2 ? { ok: false, error: "404: gone" } : { ok: true },
    );
    const { result } = setup([row(1), row(2)]);
    await act(async () => {
      await expect(
        result.current.handlePatch(1, { player_id: 55 }, "Set player X", true, { name: "Darius Acuff Jr." }),
      ).rejects.toThrow("Applied to #1; failed on #2: 404: gone");
    });
    expect(patchMock.mock.calls.map((c) => c[0])).toEqual([1, 2]);
    const [a, b] = result.current.rows;
    expect(a.player_id).toBe(55);
    expect(a.player_name).toBe("Darius Acuff Jr.");
    expect(b.player_id).toBe(7);
  });

  it("keeps local commits when the same picks come back from the server", async () => {
    patchMock.mockResolvedValue({ ok: true });
    const initial = [row(1)];
    const { result, rerender } = setup(initial);
    await act(async () => {
      await result.current.handlePatch(1, { line: 4.5 }, "Line set");
    });
    rerender({ problems: [row(1)] });
    expect(result.current.rows[0].line).toBe(4.5);
    rerender({ problems: [row(1), row(3)] });
    expect(result.current.rows.map((r) => r.pick_id)).toEqual([1, 3]);
    expect(result.current.rows[0].line).toBe(4.5);
  });

  it("a game patch only reaches siblings on that game and records them", async () => {
    patchMock.mockResolvedValue({ ok: true });
    const a = row(1, { selection: "Lakers ML", player_name: null, sport: "NBA" });
    const b = row(2, { selection: "Celtics ML", player_name: null, sport: "NBA" });
    const c = row(3, { selection: "Knicks o220.5", player_name: null, sport: "NBA" });
    const { result } = setup([a, b, c]);
    await act(async () => {
      await result.current.handlePatch(1, { game_id: "5" }, "Set game", true, {
        game: { away_team: "LAL", home_team: "BOS" },
      });
    });
    expect(patchMock.mock.calls.map((c2) => c2[0])).toEqual([1, 2]);
    expect([...result.current.patchedSiblings]).toEqual([2]);
  });

  it("a game patch without game teams never propagates", async () => {
    patchMock.mockResolvedValue({ ok: true });
    const { result } = setup([row(1), row(2)]);
    await act(async () => {
      await result.current.handlePatch(1, { game_id: "5" }, "Set game", true, { gameDate: "2026-11-06" });
    });
    expect(patchMock.mock.calls.map((c) => c[0])).toEqual([1]);
  });

  it("a player patch goes to the same player only", async () => {
    patchMock.mockResolvedValue({ ok: true });
    const a = row(1, { selection: "Sabonis o10.5 Reb", player_name: "Sabonis" });
    const b = row(2, { selection: "Murray o20.5 Pts", player_name: "Murray" });
    const { result } = setup([a, b]);
    await act(async () => {
      await result.current.handlePatch(1, { player_id: 9 }, "Set player", true, { name: "Domantas Sabonis" });
    });
    expect(patchMock.mock.calls.map((c) => c[0])).toEqual([1]);
  });

  it("keeps the selected pick when the new problems no longer contain it", async () => {
    patchMock.mockResolvedValue({ ok: true });
    const { result, rerender } = setup([row(1), row(2)], true, 1);
    await act(async () => {
      await result.current.handlePatch(1, { line: 4.5 }, "Line set");
    });
    rerender({ problems: [row(2), row(3)] });
    expect(result.current.rows.map((r) => r.pick_id)).toEqual([1, 2, 3]);
    expect(result.current.rows[0].line).toBe(4.5);
  });

  it("drops a vanished pick that is not selected", () => {
    const { result, rerender } = setup([row(1), row(2)], true, 2);
    rerender({ problems: [row(2)] });
    expect(result.current.rows.map((r) => r.pick_id)).toEqual([2]);
  });

  it("adopts a new order of the same ids and keeps local edits", async () => {
    patchMock.mockResolvedValue({ ok: true });
    const { result, rerender } = setup([row(1), row(2), row(3)]);
    await act(async () => {
      await result.current.handlePatch(1, { line: 4.5 }, "Line set");
    });
    rerender({ problems: [row(3), row(2), row(1)] });
    expect(result.current.rows.map((r) => r.pick_id)).toEqual([3, 2, 1]);
    expect(result.current.rows[2].line).toBe(4.5);
  });
});

describe("live_twin after a local edit", () => {
  const twin = { pick_id: 9, selection: "A +1" };
  const held = () => row(1, { live_twin: twin } as unknown as Partial<QueueRow>);
  const twinOf = (h: ReturnType<typeof setup>) => (h.result.current.rows[0] as unknown as { live_twin: unknown }).live_twin;

  beforeEach(() => patchMock.mockResolvedValue({ ok: true }));

  it.each([
    ["game", { game_id: "123" }],
    ["line", { line: 7.5 }],
    ["selection", { selection: "B -2" }],
    ["player", { player_id: 8 }],
    ["stat", { stat_name: "runs" }],
    ["sport", { sport: "NBA" }],
  ])("an edit to the %s clears it", async (_n, patch) => {
    const h = setup([held()], false, 1);
    await act(async () => {
      await h.result.current.handlePatch(1, patch, "ok");
    });
    expect(twinOf(h)).toBeNull();
  });

  it.each([
    ["odds", { odds_taken: -120 }],
    ["units", { units: 2 }],
  ])("an edit to the %s keeps it", async (_n, patch) => {
    const h = setup([held()], false, 1);
    await act(async () => {
      await h.result.current.handlePatch(1, patch, "ok");
    });
    expect(twinOf(h)).toEqual(twin);
  });
});
