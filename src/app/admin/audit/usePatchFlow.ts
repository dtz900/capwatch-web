"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { patchPickAction, type PickPatchInput } from "./actions";
import type { FieldKey } from "./fieldState";
import type { QueueRow } from "./labels";

/** What an editor learned from a pick: used for the local row copy and the game sort. */
export interface PickHint {
  team?: string | null;
  name?: string;
  gameDate?: string | null;
}

const PATCH_FIELD: Partial<Record<keyof PickPatchInput, FieldKey>> = {
  player_id: "player",
  game_id: "game",
  stat_name: "market",
  line: "line",
  odds_taken: "odds",
  units: "stake",
};

function applyLocal(row: QueueRow, patch: PickPatchInput, hint: PickHint | undefined): QueueRow {
  const next: QueueRow = { ...row };
  if (patch.sport !== undefined) {
    next.sport = patch.sport;
    next.game_id = null;
    next.game_date = null;
    next.player_id = null;
    next.player_name = null;
  }
  if (patch.player_id !== undefined) {
    next.player_id = patch.player_id;
    next.player_name = hint?.name ?? next.player_name;
  }
  if (patch.game_id !== undefined) {
    next.game_id = patch.game_id;
    next.game_date = hint?.gameDate ?? next.game_date;
  }
  if (patch.stat_name !== undefined) {
    next.stat_name = patch.stat_name;
    next.market = patch.stat_name;
  }
  if (patch.selection !== undefined) next.selection = patch.selection;
  if (patch.line !== undefined) next.line = patch.line;
  if (patch.odds_taken !== undefined) next.odds_taken = patch.odds_taken;
  if (patch.units !== undefined) next.units = patch.units;
  return next;
}

export function usePatchFlow(
  problems: QueueRow[],
  siblingIdsOf: (pickId: number) => number[],
  applyToSiblings: boolean,
) {
  const [rows, setRows] = useState(problems);
  const [fixed, setFixed] = useState<Record<number, FieldKey[]>>({});
  const [marketRecheck, setMarketRecheck] = useState<Record<number, string>>({});
  const [hints, setHints] = useState<Record<number, PickHint>>({});
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setRows(problems), [problems]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const show = (msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 1800);
  };

  const hintsRef = useRef<Record<number, PickHint>>({});
  const setHint = useCallback((pickId: number, hint: PickHint) => {
    // The ref is read synchronously by the patch that follows this call.
    hintsRef.current = { ...hintsRef.current, [pickId]: { ...hintsRef.current[pickId], ...hint } };
    setHints((h) => ({ ...h, [pickId]: { ...h[pickId], ...hint } }));
  }, []);

  /** Records a landed patch in the local copy. */
  const commit = (pickId: number, patch: PickPatchInput, hint: PickHint | undefined) => {
    setRows((rs) => rs.map((r) => (r.pick_id === pickId ? applyLocal(r, patch, hint) : r)));
    setFixed((f) => {
      const keys = new Set(f[pickId] ?? []);
      if (patch.sport !== undefined) {
        keys.delete("player");
        keys.delete("game");
        keys.delete("market");
      }
      for (const [k, field] of Object.entries(PATCH_FIELD)) {
        if (field && patch[k as keyof PickPatchInput] !== undefined) keys.add(field);
      }
      return { ...f, [pickId]: [...keys] };
    });
    setMarketRecheck((m) => {
      const { [pickId]: _drop, ...rest } = m;
      return patch.sport !== undefined ? { ...rest, [pickId]: patch.sport } : rest;
    });
  };

  const handlePatch = async (
    pickId: number,
    patch: PickPatchInput,
    okMessage: string,
    propagate = false,
  ): Promise<void> => {
    setPending(true);
    try {
      const hint = hintsRef.current[pickId];
      const res = await patchPickAction(pickId, patch);
      if (!res.ok) throw new Error(res.error);
      commit(pickId, patch, hint);

      const failed: string[] = [];
      const done: number[] = [];
      if (propagate && applyToSiblings) {
        for (const id of siblingIdsOf(pickId)) {
          const r = await patchPickAction(id, patch);
          if (r.ok) {
            commit(id, patch, hint);
            done.push(id);
          } else failed.push(`#${id}: ${r.error}`);
        }
      }
      const also = done.length ? ` on #${pickId}, ${done.map((i) => `#${i}`).join(", ")}` : "";
      show(failed.length ? `${okMessage} on #${pickId}; failed on ${failed.join("; ")}` : `${okMessage}${also}`);
    } finally {
      setPending(false);
    }
  };

  return { rows, fixed, marketRecheck, hints, setHint, pending, toast, handlePatch };
}
