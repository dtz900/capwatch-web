// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueueRow } from "./labels";

const m = {
  regrade: vi.fn(),
  grade: vi.fn(),
  del: vi.fn(),
  ack: vi.fn(),
  unack: vi.fn(),
  refresh: vi.fn(),
};
vi.mock("./actions", () => ({
  regradeAction: (...a: unknown[]) => m.regrade(...a),
  manualGradeAction: (...a: unknown[]) => m.grade(...a),
  deletePickAction: (...a: unknown[]) => m.del(...a),
  ackAuditAction: (...a: unknown[]) => m.ack(...a),
  unackAuditAction: (...a: unknown[]) => m.unack(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));

import { MANUAL_GRADE_COPY, useTerminalActions } from "./useTerminalActions";

function row(id: number, over: Partial<QueueRow> = {}): QueueRow {
  return {
    pick_id: id,
    capper_id: 1,
    sport: "MLB",
    capper_handle: "x",
    capper_display_name: null,
    kind: "ungraded",
    reason: "no_grade_row",
    market: "hits",
    stat_name: "hits",
    selection: "Acuff o4.5",
    line: 4.5,
    odds_taken: -110,
    units: 1,
    player_id: 7,
    game_id: "99",
    game_date: "2026-11-06",
    parlay_id: null,
    posted_at: null,
    raw_id: 50,
    tweet_text: null,
    tweet_url: null,
    posted_label: null,
    game_label: null,
    ...over,
  } as QueueRow;
}

function setup(rows: QueueRow[], selectedId: number, over: { showAcked?: boolean } = {}) {
  const a = {
    rows,
    selectedId,
    setSelectedId: vi.fn(),
    applyToSiblings: true,
    showAcked: over.showAcked ?? false,
    markets: null,
    fixed: {},
    marketRecheck: {},
    setPending: vi.fn(),
    show: vi.fn(),
    removeRows: vi.fn(),
  };
  const hook = renderHook(() => useTerminalActions(a));
  return { a, hook };
}

describe("useTerminalActions", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.regrade.mockResolvedValue({ ok: true });
    m.grade.mockResolvedValue({ ok: true });
    m.del.mockResolvedValue({ ok: true });
    m.ack.mockResolvedValue({ ok: true, acked: 1 });
    m.unack.mockResolvedValue({ ok: true, acked: 1 });
  });

  it("regrades a clean sibling and skips one with a red field", async () => {
    const rows = [row(1), row(2), row(3, { game_id: null })];
    const { a, hook } = setup(rows, 1);
    await act(() => hook.result.current.regrade());
    expect(m.regrade.mock.calls.map((c) => c[0])).toEqual([1, 2]);
    expect(a.removeRows).toHaveBeenCalledWith([1, 2]);
    expect(a.show).toHaveBeenCalledWith("Saved, regrading: #1 and #2");
    expect(m.refresh).toHaveBeenCalled();
  });

  it("maps a 409 to the manual-grade copy and keeps the selection", async () => {
    m.regrade.mockResolvedValue({ ok: false, error: "409: pick already graded" });
    const { a, hook } = setup([row(1), row(2, { raw_id: 9 })], 1);
    await act(() => hook.result.current.regrade());
    expect(hook.result.current.message).toBe(MANUAL_GRADE_COPY);
    expect(a.setSelectedId).not.toHaveBeenCalled();
    expect(a.removeRows).not.toHaveBeenCalled();
  });

  it("does not treat a pick id containing 409 as a conflict", async () => {
    m.regrade.mockResolvedValue({ ok: false, error: "500: pick 14093 failed" });
    const { hook } = setup([row(14093)], 14093);
    await act(() => hook.result.current.regrade());
    expect(hook.result.current.message).toBe("500: pick 14093 failed");
  });

  it("skip acks, or unacks when the queue shows triaged rows", async () => {
    const first = setup([row(1, { raw_id: 1 }), row(2, { raw_id: 2 })], 1);
    await act(() => first.hook.result.current.skip());
    expect(m.ack).toHaveBeenCalledWith({ pickIds: [1] });
    expect(first.a.show).toHaveBeenCalledWith("Triaged: #1");

    const second = setup([row(1, { raw_id: 1 })], 1, { showAcked: true });
    await act(() => second.hook.result.current.skip());
    expect(m.unack).toHaveBeenCalledWith([1]);
    expect(second.a.show).toHaveBeenCalledWith("Unskipped: #1");
  });

  it("delete does nothing when the confirm is declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { a, hook } = setup([row(1)], 1);
    await act(() => hook.result.current.remove());
    expect(m.del).not.toHaveBeenCalled();
    expect(a.removeRows).not.toHaveBeenCalled();
  });

  it("selects the right next row when a sibling ahead of the pick is removed too", async () => {
    const rows = [row(1), row(2), row(3, { raw_id: 77 })];
    const { a, hook } = setup(rows, 2);
    await act(() => hook.result.current.regrade());
    expect(a.removeRows).toHaveBeenCalledWith([2, 1]);
    expect(a.setSelectedId).toHaveBeenCalledWith(3);
  });

  it("a thrown action error sets the message and leaves the rows intact", async () => {
    m.grade.mockRejectedValue(new Error("network down"));
    const { a, hook } = setup([row(1), row(2, { raw_id: 9 })], 1);
    await act(() => hook.result.current.grade("win"));
    expect(hook.result.current.message).toBe("network down");
    expect(a.removeRows).not.toHaveBeenCalled();
    expect(a.setSelectedId).not.toHaveBeenCalled();
    expect(a.setPending).toHaveBeenLastCalledWith(false);

    m.regrade.mockRejectedValue(new Error("boom"));
    await act(() => hook.result.current.regrade());
    expect(hook.result.current.message).toBe("boom");
    expect(a.removeRows).not.toHaveBeenCalled();
  });

  it("ignores a second press while one action is in flight", async () => {
    let release: (v: unknown) => void = () => {};
    m.grade.mockReturnValue(new Promise((r) => (release = r)));
    const { hook } = setup([row(1)], 1);
    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = hook.result.current.grade("win");
      void hook.result.current.grade("loss");
    });
    expect(m.grade).toHaveBeenCalledTimes(1);
    await act(async () => {
      release({ ok: true });
      await first;
    });
  });
});
