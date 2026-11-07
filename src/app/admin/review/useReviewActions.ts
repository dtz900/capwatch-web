"use client";

import { useRef, useState } from "react";
import { nextSelection } from "../audit/selection";
import {
  approvePickAction,
  batchApprovePicksAction,
  batchRejectPicksAction,
  rejectPickAction,
} from "./actions";
import type { ReviewRow } from "./reviewRow";

export const UNBOUND_COPY = "Set the game first, or reject.";

interface Args {
  rows: ReviewRow[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  selection: ReadonlySet<number>;
  setSelection: (next: Set<number>) => void;
  setPending: (v: boolean) => void;
  show: (msg: string) => void;
  removeRows: (ids: number[]) => void;
  refresh: () => void;
}

type Outcome = { ok: true; removed: number[]; toast: string } | { ok: false; error: string };

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export const canApprove = (row: ReviewRow) => row.game_id != null || row.parlay_id != null;

/** Terminal actions for the review queue: approve or reject one pick or many. */
export function useReviewActions(a: Args) {
  // Set synchronously so two fast presses cannot both fire before `pending` re-renders.
  const inFlight = useRef(false);
  // A message belongs to the pick that was selected when it was set, so it clears on navigation.
  const [note, setNote] = useState<{ text: string; forId: number | null } | null>(null);
  const message = note && note.forId === a.selectedId ? note.text : null;
  const setMessage = (text: string | null) => setNote(text == null ? null : { text, forId: a.selectedId });

  const settle = (ids: number[], toast: string) => {
    const gone = new Set(ids);
    const remaining = a.rows.filter((r) => !gone.has(r.pick_id));
    const focus = a.selectedId != null && gone.has(a.selectedId) ? a.selectedId : null;
    a.removeRows(ids);
    a.setSelection(new Set([...a.selection].filter((id) => !gone.has(id))));
    if (focus != null) {
      const index = a.rows.findIndex((r) => r.pick_id === focus);
      const before = a.rows.slice(0, Math.max(index, 0)).filter((r) => gone.has(r.pick_id)).length;
      a.setSelectedId(nextSelection(remaining, index - before));
    }
    a.show(toast);
    a.refresh();
  };

  const run = async (call: () => Promise<Outcome>, prefix = "") => {
    if (inFlight.current) return;
    inFlight.current = true;
    a.setPending(true);
    setMessage(null);
    try {
      const res = await call();
      if (!res.ok) setMessage(prefix + res.error);
      else if (res.removed.length > 0) settle(res.removed, res.toast);
      else a.show(res.toast);
    } catch (err) {
      setMessage(prefix + errText(err));
    } finally {
      inFlight.current = false;
      a.setPending(false);
    }
  };

  const approve = (id: number) => {
    const row = a.rows.find((r) => r.pick_id === id);
    if (!row) return Promise.resolve();
    if (!canApprove(row)) {
      setMessage(UNBOUND_COPY);
      return Promise.resolve();
    }
    return run(async () => {
      const res = await approvePickAction(id);
      return res.ok ? { ok: true, removed: [id], toast: `Approved #${id}` } : res;
    }, `#${id}: `);
  };

  const reject = (id: number) =>
    run(async () => {
      const res = await rejectPickAction(id);
      return res.ok ? { ok: true, removed: [id], toast: `Rejected #${id}` } : res;
    }, `#${id}: `);

  const approveMany = (ids: number[], label?: string) =>
    ids.length === 0
      ? Promise.resolve()
      : run(async () => {
          const res = await batchApprovePicksAction(ids);
          if (!res.ok) return res;
          const skipped = new Set(res.skipped.map((s) => s.pick_id));
          let toast = label ? `Approved ${res.approved} ${label}` : `Approved ${res.approved} picks`;
          if (res.skipped.length) {
            toast += `, skipped ${res.skipped.map((s) => `#${s.pick_id} (${s.reason})`).join(", ")}`;
          }
          return { ok: true, removed: ids.filter((id) => !skipped.has(id)), toast };
        });

  const rejectMany = (ids: number[], label?: string) =>
    ids.length === 0
      ? Promise.resolve()
      : run(async () => {
          const res = await batchRejectPicksAction(ids);
          if (!res.ok) return res;
          return {
            ok: true,
            removed: ids,
            toast: label ? `Rejected ${res.rejected} ${label}` : `Rejected ${res.rejected} picks`,
          };
        });

  return { approve, reject, approveMany, rejectMany, canApprove, message };
}
