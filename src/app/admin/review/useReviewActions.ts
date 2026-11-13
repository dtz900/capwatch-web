"use client";

import { useRef, useState } from "react";
import {
  entryFromDetail,
  entryFromRefused,
  identityFingerprint,
  parseDuplicateDetail,
  type DuplicateEntry,
} from "@/lib/liveTwin";
import { nextSelection } from "../audit/selection";
import {
  approvePickAction,
  batchApprovePicksAction,
  batchRejectPicksAction,
  rejectPickAction,
} from "./actions";
import { ptLabel, type ReviewRow } from "./reviewRow";

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

/** `toast: null` means nothing to flash (the notice already says it). */
type Outcome = { ok: true; removed: number[]; toast: string | null } | { ok: false; error: string };

/** A refused duplicate waiting in the notice. `error` is a failed "second bet" approve. */
export type NoticeEntry = DuplicateEntry & {
  error?: string;
  /** Identity of the pick (game, line, selection...) at the moment it was refused. */
  fp: string;
};

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

  // Refused duplicates stay on screen until dismissed (the toast clears after 1.8 seconds).
  const [entries, setEntries] = useState<NoticeEntry[]>([]);
  // A refusal belongs to the bet as it was when refused. `at` is the rows as they were then.
  const addEntries = (list: DuplicateEntry[], at: ReviewRow[]) => {
    const stamped = list.map((e) => {
      const r = at.find((x) => x.pick_id === e.pickId);
      return { ...e, fp: identityFingerprint(r ?? {}), stampOdds: r?.odds_taken ?? null, stampUnits: r?.units ?? null };
    });
    setEntries((prev) => [...prev.filter((p) => !stamped.some((n) => n.pickId === p.pickId)), ...stamped]);
  };
  const entryError = (pickId: number, error: string | undefined) =>
    setEntries((prev) => prev.map((e) => (e.pickId === pickId ? { ...e, error } : e)));
  // An entry survives only while its pick is still in the queue AND still the bet that was refused:
  // a pick that left, or whose game, line, selection, player, stat or sport changed, drops out for good
  // (editing it back does not revive it). Odds and units edits keep it.
  const notice = entries.filter((e) => {
    const r = a.rows.find((x) => x.pick_id === e.pickId);
    return r != null && identityFingerprint(r) === e.fp;
  });
  if (notice.length !== entries.length) setEntries(notice);
  const dismissNotice = () => setEntries([]);

  const settle = (ids: number[], toast: string | null) => {
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
    if (toast != null) a.show(toast);
    a.refresh();
  };

  const run = async (call: () => Promise<Outcome>, prefix = "", onError?: (text: string) => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    a.setPending(true);
    setMessage(null);
    try {
      const res = await call();
      if (!res.ok) (onError ?? setMessage)(prefix + res.error);
      else if (res.removed.length > 0) settle(res.removed, res.toast);
      else if (res.toast != null) a.show(res.toast);
    } catch (err) {
      (onError ?? setMessage)(prefix + errText(err));
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
      if (res.ok) return { ok: true, removed: [id], toast: `Approved #${id}` };
      const detail = parseDuplicateDetail(res.error);
      if (detail == null) return res;
      // The fresh refusal is the source of truth. The queue item's structured live_twin is used only
      // when it is the very pick the backend just named; after an edit it may be about a different pick.
      const parsed = entryFromDetail(id, detail);
      const twin = row.live_twin;
      const now = new Date();
      addEntries(
        [
          twin && twin.pick_id === parsed.existingPickId
            ? entryFromRefused({ pick_id: id, reason: detail, same_batch: false, live_twin: twin }, (iso) => ptLabel(iso, now))
            : parsed,
        ],
        [row],
      );
      return { ok: true, removed: [], toast: null };
    }, `#${id}: `);
  };

  /** The deliberate second bet: only ever called from its own button, never from Enter or a batch. */
  const approveAnyway = (id: number) => {
    // An override needs a current reason to exist: a current notice entry, or the loaded live_twin the
    // detail block shows (identity edits clear it). Anything else was refused for a different bet.
    const row = a.rows.find((r) => r.pick_id === id);
    if (!notice.some((e) => e.pickId === id) && row?.live_twin == null) return Promise.resolve();
    entryError(id, undefined);
    return run(
      async () => {
        const res = await approvePickAction(id, { allowDuplicate: true });
        return res.ok ? { ok: true, removed: [id], toast: `Approved #${id} as a second bet` } : res;
      },
      "",
      // A pick that loaded with a live copy has no notice entry yet: show the failure on the message line.
      (text) => (entries.some((e) => e.pickId === id) ? entryError(id, text) : setMessage(`#${id}: ${text}`)),
    );
  };

  const reject = (id: number) =>
    run(async () => {
      const res = await rejectPickAction(id);
      return res.ok ? { ok: true, removed: [id], toast: `Rejected #${id}` } : res;
    }, `#${id}: `);

  const approveMany = (ids: number[], label?: string) => {
    const rowsAtCall = a.rows;
    return ids.length === 0
      ? Promise.resolve()
      : run(async () => {
          const res = await batchApprovePicksAction(ids);
          if (!res.ok) return res;
          const skipped = new Set(res.skipped.map((s) => s.pick_id));
          const refusedList = res.refused ?? [];
          const refused = new Set(refusedList.map((r) => r.pick_id));
          const others = res.skipped.filter((s) => !refused.has(s.pick_id));
          let toast = label ? `Approved ${res.approved} ${label}` : `Approved ${res.approved} picks`;
          if (others.length) toast += `, skipped ${others.map((s) => `#${s.pick_id} (${s.reason})`).join(", ")}`;
          if (refused.size) {
            const now = new Date();
            addEntries(refusedList.map((r) => entryFromRefused(r, (iso) => ptLabel(iso, now))), rowsAtCall);
            toast += `, ${refused.size} already live (see the notice)`;
          }
          return { ok: true, removed: ids.filter((id) => !skipped.has(id)), toast };
        });

  };

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

  return { approve, approveAnyway, reject, approveMany, rejectMany, canApprove, message, notice, dismissNotice };
}
