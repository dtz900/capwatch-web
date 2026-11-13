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

const DETAIL =
  "Already live as pick 9 ('A +1' line 1.0 units 1, posted 11-11 19:48 UTC, x.com/h/status/5). Price or stake differs: this one -112, 1.12u vs no odds, 1u. May be a deliberate second bet.";
const refusal = { ok: false, error: `409: ${JSON.stringify({ detail: DETAIL })}` };

describe("useReviewActions duplicates", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
  });

  it("a refused single approve keeps the row, shows a readable notice and no raw error", async () => {
    m.approve.mockResolvedValue(refusal);
    const { a, hook } = setup([row(1, { selection: "A +1" })], 1, []);
    await act(async () => {
      await hook.result.current.approve(1);
    });
    expect(m.approve).toHaveBeenCalledWith(1);
    expect(a.removeRows).not.toHaveBeenCalled();
    expect(a.show).not.toHaveBeenCalled();
    expect(hook.result.current.message).toBeNull();
    expect(hook.result.current.notice).toHaveLength(1);
    expect(hook.result.current.notice[0]).toMatchObject({
      pickId: 1,
      existingPickId: 9,
      tweetUrl: "https://x.com/h/status/5",
    });
  });

  it("approveAnyway is the only call that sends the override", async () => {
    m.approve.mockResolvedValueOnce(refusal);
    const { a, hook } = setup([row(1)], 1, []);
    await act(async () => {
      await hook.result.current.approve(1);
    });
    expect(m.approve.mock.calls[0]).toEqual([1]);
    expect(hook.result.current.notice).toHaveLength(1);
    m.approve.mockResolvedValueOnce({ ok: true });
    await act(async () => {
      await hook.result.current.approveAnyway(1);
    });
    expect(m.approve).toHaveBeenLastCalledWith(1, { allowDuplicate: true });
    expect(a.removeRows).toHaveBeenCalledWith([1]);
    expect(a.show).toHaveBeenCalledWith("Approved #1 as a second bet");
  });

  it("dismiss clears the notice", async () => {
    m.approve.mockResolvedValue(refusal);
    const { hook } = setup([row(1)], 1, []);
    await act(async () => {
      await hook.result.current.approve(1);
    });
    act(() => hook.result.current.dismissNotice());
    expect(hook.result.current.notice).toEqual([]);
  });

  it("a non-duplicate 409 keeps today's behaviour", async () => {
    m.approve.mockResolvedValue({ ok: false, error: '409: {"detail":"already approved"}' });
    const { hook } = setup([row(1)], 1, []);
    await act(async () => {
      await hook.result.current.approve(1);
    });
    expect(hook.result.current.notice).toEqual([]);
    expect(hook.result.current.message).toBe('#1: 409: {"detail":"already approved"}');
  });

  it("batch approve never sends the override, keeps refused rows and lists them", async () => {
    m.batchApprove.mockResolvedValue({
      ok: true,
      approved: 1,
      skipped: [
        { pick_id: 2, reason: DETAIL },
        { pick_id: 3, reason: "unbound" },
      ],
      refused: [{ pick_id: 2, reason: DETAIL, same_batch: true, live_twin: null }],
    });
    const { a, hook } = setup([row(1), row(2), row(3)], 1, [1, 2, 3]);
    await act(async () => {
      await hook.result.current.approveMany([1, 2, 3]);
    });
    expect(m.batchApprove).toHaveBeenCalledWith([1, 2, 3]);
    expect(a.removeRows).toHaveBeenCalledWith([1]);
    expect(a.show).toHaveBeenCalledWith("Approved 1 picks, skipped #3 (unbound), 1 already live (see the notice)");
    expect(hook.result.current.notice.map((e) => [e.pickId, e.sameBatch])).toEqual([[2, true]]);
  });

  it("a failed approve-anyway shows its error inside the notice", async () => {
    m.approve.mockResolvedValueOnce(refusal).mockResolvedValueOnce({ ok: false, error: "500: boom" });
    const { hook } = setup([row(1)], 1, []);
    await act(async () => {
      await hook.result.current.approve(1);
    });
    await act(async () => {
      await hook.result.current.approveAnyway(1);
    });
    expect(hook.result.current.notice[0].error).toBe("500: boom");
    expect(hook.result.current.message).toBeNull();
  });

  it("a failed second-bet click on a pick with no notice entry shows on the message line", async () => {
    m.approve.mockResolvedValue({ ok: false, error: "400: pick is auto_approved, not needs_review" });
    const { hook } = setup([row(1)], 1, []);
    await act(async () => {
      await hook.result.current.approveAnyway(1);
    });
    expect(m.approve).toHaveBeenCalledWith(1, { allowDuplicate: true });
    expect(hook.result.current.message).toBe("#1: 400: pick is auto_approved, not needs_review");
    expect(hook.result.current.notice).toEqual([]);
  });

  it("uses the queue item's live_twin when it is the pick the refusal names", async () => {
    m.approve.mockResolvedValue(refusal);
    const twin = {
      pick_id: 9,
      raw_id: 2,
      selection: "Structured +1",
      line: 1,
      odds_taken: -105,
      units: 2,
      posted_at: "2026-11-11T19:48:40+00:00",
      tweet_id: "5",
      tweet_url: "https://x.com/h/status/5",
    };
    const { hook } = setup([row(1, { live_twin: { ...twin, posted_label: "" } as ReviewRow["live_twin"] })], 1, []);
    await act(async () => {
      await hook.result.current.approve(1);
    });
    expect(hook.result.current.notice[0]).toMatchObject({ existingPickId: 9, tweetUrl: "https://x.com/h/status/5" });
    expect(hook.result.current.notice[0].existing).toContain("Structured +1, -105, 2u");
  });

  it("an edited pick refused against a different live pick shows the new pick, not the stale twin", async () => {
    m.approve.mockResolvedValue(refusal); // names pick 9 with link x.com/h/status/5
    const stale = {
      pick_id: 77,
      raw_id: 2,
      selection: "Old Twin -3",
      line: -3,
      odds_taken: -105,
      units: 2,
      posted_at: "2026-11-11T19:48:40+00:00",
      tweet_id: "8",
      tweet_url: "https://x.com/old/status/8",
      posted_label: "",
    };
    const { hook } = setup([row(1, { live_twin: stale as ReviewRow["live_twin"] })], 1, []);
    await act(async () => {
      await hook.result.current.approve(1);
    });
    const e = hook.result.current.notice[0];
    expect(e.existingPickId).toBe(9);
    expect(e.tweetUrl).toBe("https://x.com/h/status/5");
    expect(e.existing).not.toContain("Old Twin");
  });
});
