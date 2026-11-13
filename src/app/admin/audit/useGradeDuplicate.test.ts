// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueueRow } from "./labels";

const m = { grade: vi.fn(), refresh: vi.fn() };
vi.mock("./actions", () => ({
  regradeAction: vi.fn(),
  manualGradeAction: (...a: unknown[]) => m.grade(...a),
  deletePickAction: vi.fn(),
  ackAuditAction: vi.fn(),
  unackAuditAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));

import { useTerminalActions } from "./useTerminalActions";

const DETAIL =
  "Already live as pick 9 ('A +1' line 1.0 odds -110 units 1, posted 11-11 19:48 UTC, x.com/h/status/5).";
const refusal = { ok: false, error: `409: ${JSON.stringify({ detail: DETAIL })}` };

const row = (over: Partial<QueueRow> = {}) =>
  ({
    pick_id: 1,
    selection: "A +1",
    market: "spread",
    line: 1,
    odds_taken: -110,
    units: 1,
    game_id: "g",
    player_id: null,
    stat_name: null,
    ...over,
  }) as unknown as QueueRow;

function setup(initial: QueueRow) {
  let rows = [initial];
  const a = {
    get rows() {
      return rows;
    },
    selectedId: 1,
    setSelectedId: vi.fn(),
    applyToSiblings: false,
    patchedSiblings: new Set<number>(),
    showAcked: false,
    markets: null,
    fixed: {},
    marketRecheck: {},
    setPending: vi.fn(),
    show: vi.fn(),
    removeRows: vi.fn(),
  };
  const hook = renderHook(() => useTerminalActions(a));
  return {
    a,
    hook,
    edit: (over: Partial<QueueRow>) => {
      rows = [{ ...rows[0], ...over }];
      hook.rerender();
    },
  };
}

describe("grade anyway", () => {
  beforeEach(() => {
    m.grade.mockReset();
    m.refresh.mockReset();
  });

  it("a refused grade offers Grade anyway, which resends the same outcome with the override", async () => {
    m.grade.mockResolvedValueOnce(refusal).mockResolvedValueOnce({ ok: true });
    const { hook } = setup(row());
    await act(async () => {
      await hook.result.current.grade("win");
    });
    expect(m.grade).toHaveBeenLastCalledWith(1, "win");
    expect(hook.result.current.duplicate?.entry.existingPickId).toBe(9);
    expect(hook.result.current.message).toBeNull();
    await act(async () => {
      await hook.result.current.gradeAnyway();
    });
    expect(m.grade).toHaveBeenLastCalledWith(1, "win", { allowDuplicate: true });
  });

  it("editing the pick after the refusal drops the offer, so the override cannot skip the check", async () => {
    m.grade.mockResolvedValue(refusal);
    const { hook, edit } = setup(row());
    await act(async () => {
      await hook.result.current.grade("loss");
    });
    expect(hook.result.current.duplicate).not.toBeNull();
    edit({ units: 2 });
    expect(hook.result.current.duplicate).toBeNull();
    await act(async () => {
      await hook.result.current.gradeAnyway();
    });
    expect(m.grade).toHaveBeenCalledTimes(1);
  });
});
