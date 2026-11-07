"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ackAuditAction,
  deletePickAction,
  manualGradeAction,
  regradeAction,
  unackAuditAction,
  type AckResult,
  type ActionResult,
  type MarketDef,
} from "./actions";
import { effectiveStates, type FieldKey } from "./fieldState";
import type { QueueRow } from "./labels";
import { nextSelection } from "./selection";
import { siblingIdsFor } from "./siblings";
import type { GradeOutcome } from "./useAuditKeys";

/** The API reports a failed call as "<status>: <body>". */
const MANUAL_GRADE_ERROR = /^409:|manual grade/i;

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export const MANUAL_GRADE_COPY = "This pick has a manual grade. Use Win / Loss / Push / Void to change it.";

const GRADE_TOAST: Record<GradeOutcome, string> = {
  win: "Graded win",
  loss: "Graded loss",
  push: "Graded push",
  void: "Voided",
};

interface Args {
  rows: QueueRow[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  applyToSiblings: boolean;
  /** Siblings that received a field patch this session; only these are regraded with the primary. */
  patchedSiblings: ReadonlySet<number>;
  showAcked: boolean;
  markets: MarketDef[] | null;
  marketsError?: boolean;
  fixed: Record<number, FieldKey[]>;
  marketRecheck: Record<number, string>;
  setPending: (v: boolean) => void;
  show: (msg: string) => void;
  removeRows: (ids: number[]) => void;
}

/** Actions that end a pick's time in the queue: they remove the row, move the
 * selection on and refresh the server data in the background. */
export function useTerminalActions(a: Args) {
  const router = useRouter();
  // Set synchronously so two fast presses cannot both fire before `pending` re-renders.
  const inFlight = useRef(false);
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  // An error belongs to the pick it happened on and disappears when another is selected.
  const message = msg && msg.id === a.selectedId ? msg.text : null;

  const settle = (ids: number[], toast: string) => {
    const index = a.rows.findIndex((r) => r.pick_id === ids[0]);
    const before = a.rows.slice(0, Math.max(index, 0)).filter((r) => ids.includes(r.pick_id)).length;
    const remaining = a.rows.filter((r) => !ids.includes(r.pick_id));
    a.removeRows(ids);
    a.setSelectedId(nextSelection(remaining, index - before));
    a.show(toast);
    router.refresh();
  };

  const run = async (id: number, call: () => Promise<ActionResult | AckResult>, toast: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    a.setPending(true);
    setMsg(null);
    try {
      const res = await call();
      if (!res.ok) {
        setMsg({ id, text: res.error });
        return;
      }
      settle([id], toast);
    } catch (err) {
      setMsg({ id, text: errText(err) });
    } finally {
      inFlight.current = false;
      a.setPending(false);
    }
  };

  const hasRed = (r: QueueRow) =>
    effectiveStates(r, a.markets, a.fixed[r.pick_id] ?? [], a.marketRecheck[r.pick_id] ?? null, {
      marketsError: a.marketsError,
    }).some(
      (s) => s.red && !s.fixed,
    );

  const regrade = async () => {
    const id = a.selectedId;
    const row = a.rows.find((r) => r.pick_id === id);
    if (id == null || !row || inFlight.current) return;
    inFlight.current = true;
    a.setPending(true);
    setMsg(null);
    try {
      const res = await regradeAction(id);
      if (!res.ok) {
        setMsg({ id, text: MANUAL_GRADE_ERROR.test(res.error) ? MANUAL_GRADE_COPY : res.error });
        return;
      }
      const done = [id];
      const failed: string[] = [];
      const skipped: number[] = [];
      if (a.applyToSiblings) {
        for (const sib of siblingIdsFor(a.rows, row)) {
          const sibRow = a.rows.find((r) => r.pick_id === sib);
          if (!sibRow || !a.patchedSiblings.has(sib)) continue;
          if (hasRed(sibRow)) {
            skipped.push(sib);
            continue;
          }
          const r = await regradeAction(sib);
          if (r.ok) done.push(sib);
          else failed.push(`#${sib}: ${r.error}`);
        }
      }
      let saved = `Saved, regrading: ${done.map((d) => `#${d}`).join(" and ")}`;
      if (skipped.length) saved += `; ${skipped.map((d) => `#${d}`).join(", ")} still needs fixing`;
      settle(done, failed.length ? `${saved}. Regrade failed on ${failed.join("; ")}` : saved);
    } catch (err) {
      setMsg({ id, text: errText(err) });
    } finally {
      inFlight.current = false;
      a.setPending(false);
    }
  };

  const grade = (outcome: GradeOutcome) => {
    const id = a.selectedId;
    if (id == null) return Promise.resolve();
    return run(id, () => manualGradeAction(id, outcome), `${GRADE_TOAST[outcome]}: #${id}`);
  };

  const skip = () => {
    const id = a.selectedId;
    if (id == null) return Promise.resolve();
    return run(
      id,
      () => (a.showAcked ? unackAuditAction([id]) : ackAuditAction({ pickIds: [id] })),
      a.showAcked ? `Unskipped: #${id}` : `Triaged: #${id}`,
    );
  };

  const remove = () => {
    const id = a.selectedId;
    if (id == null) return Promise.resolve();
    if (inFlight.current) return Promise.resolve();
    if (!window.confirm(`Delete pick #${id}? This is for parser garbage that was never a real bet.`)) {
      return Promise.resolve();
    }
    return run(id, () => deletePickAction(id), `Deleted: #${id}`);
  };

  return { message, regrade, grade, skip, remove };
}
