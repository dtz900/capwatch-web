// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewRow } from "./reviewRow";

const m = { approve: vi.fn(), reject: vi.fn(), batchApprove: vi.fn(), batchReject: vi.fn() };
vi.mock("./actions", () => ({
  approvePickAction: (...a: unknown[]) => m.approve(...a),
  rejectPickAction: (...a: unknown[]) => m.reject(...a),
  batchApprovePicksAction: (...a: unknown[]) => m.batchApprove(...a),
  batchRejectPicksAction: (...a: unknown[]) => m.batchReject(...a),
}));

import { useReviewActions } from "./useReviewActions";

const row = (id: number, over: Partial<ReviewRow> = {}) =>
  ({ pick_id: id, game_id: "g", parlay_id: null, raw_id: 1, ...over }) as unknown as ReviewRow;

function setup(rows: ReviewRow[], selectedId: number, selection: number[]) {
  const a = {
    rows,
    selectedId,
    setSelectedId: vi.fn(),
    selection: new Set(selection),
    setSelection: vi.fn(),
    setPending: vi.fn(),
    show: vi.fn(),
    removeRows: vi.fn(),
    refresh: vi.fn(),
  };
  return { a, hook: renderHook(() => useReviewActions(a)) };
}

describe("useReviewActions", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.approve.mockResolvedValue({ ok: true });
    m.reject.mockResolvedValue({ ok: true });
  });

  it("approve removes the row, drops it from the selection and advances", async () => {
    const { a, hook } = setup([row(1), row(2), row(3)], 2, [2, 3]);
    await act(async () => {
      await hook.result.current.approve(2);
    });
    expect(m.approve).toHaveBeenCalledWith(2);
    expect(a.removeRows).toHaveBeenCalledWith([2]);
    expect(a.setSelection).toHaveBeenCalledWith(new Set([3]));
    expect(a.setSelectedId).toHaveBeenCalledWith(3);
    expect(a.show).toHaveBeenCalledWith("Approved #2");
    expect(a.refresh).toHaveBeenCalled();
  });

  it("refuses approve on an unbound straight", async () => {
    const { a, hook } = setup([row(1, { game_id: null })], 1, []);
    expect(hook.result.current.canApprove(a.rows[0])).toBe(false);
    await act(async () => {
      await hook.result.current.approve(1);
    });
    expect(m.approve).not.toHaveBeenCalled();
    expect(hook.result.current.message).toBe("Set the game first, or reject.");
  });

  it("a server error keeps the row and shows the message", async () => {
    m.approve.mockResolvedValue({ ok: false, error: "400: no game" });
    const { a, hook } = setup([row(1), row(2)], 1, []);
    await act(async () => {
      await hook.result.current.approve(1);
    });
    expect(a.removeRows).not.toHaveBeenCalled();
    expect(a.setSelectedId).not.toHaveBeenCalled();
    expect(hook.result.current.message).toBe("#1: 400: no game");
  });

  it("clears the message when the selection moves", async () => {
    const rows = [row(1, { game_id: null }), row(2)];
    let selectedId = 1;
    const a = {
      rows,
      get selectedId() {
        return selectedId;
      },
      setSelectedId: vi.fn(),
      selection: new Set<number>(),
      setSelection: vi.fn(),
      setPending: vi.fn(),
      show: vi.fn(),
      removeRows: vi.fn(),
      refresh: vi.fn(),
    };
    const hook = renderHook(() => useReviewActions(a));
    await act(async () => {
      await hook.result.current.approve(1);
    });
    expect(hook.result.current.message).toBe("Set the game first, or reject.");
    selectedId = 2;
    hook.rerender();
    expect(hook.result.current.message).toBeNull();
  });

  it("approveMany reports skipped", async () => {
    m.batchApprove.mockResolvedValue({ ok: true, approved: 1, skipped: [{ pick_id: 3, reason: "unbound" }] });
    const { a, hook } = setup([row(1), row(3)], 1, [1, 3]);
    await act(async () => {
      await hook.result.current.approveMany([1, 3]);
    });
    expect(a.removeRows).toHaveBeenCalledWith([1]);
    expect(a.show).toHaveBeenCalledWith("Approved 1 picks, skipped #3 (unbound)");
  });
});
