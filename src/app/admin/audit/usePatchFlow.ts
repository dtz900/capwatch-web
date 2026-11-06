"use client";

import { useEffect, useRef, useState } from "react";
import { patchPickFieldAction, type PickPatchInput } from "./actions";
import type { FieldKey } from "./fieldState";
import type { QueueRow } from "./labels";
import { siblingIdsFor } from "./siblings";

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

export function usePatchFlow(problems: QueueRow[], applyToSiblings: boolean) {
  const [rows, setRows] = useState(problems);
  const [fixed, setFixed] = useState<Record<number, FieldKey[]>>({});
  const [marketRecheck, setMarketRecheck] = useState<Record<number, string>>({});
  const [hints, setHints] = useState<Record<number, PickHint>>({});
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resync only when the set of picks changes; rows already held keep their local commits.
  const [seen, setSeen] = useState(problems);
  if (seen !== problems) {
    setSeen(problems);
    const idKey = (rs: QueueRow[]) => rs.map((r) => r.pick_id).sort((x, y) => x - y).join(",");
    if (idKey(problems) !== idKey(rows)) {
      const local = new Map(rows.map((r) => [r.pick_id, r]));
      setRows(problems.map((r) => local.get(r.pick_id) ?? r));
    }
  }
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const siblingIdsOfPick = (id: number): number[] => {
    const row = rowsRef.current.find((r) => r.pick_id === id);
    return row ? siblingIdsFor(rowsRef.current, row) : [];
  };

  const show = (msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 1800);
  };

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
    if (hint) setHints((h) => ({ ...h, [pickId]: { ...h[pickId], ...hint } }));
    if (patch.sport !== undefined) setMarketRecheck((m) => ({ ...m, [pickId]: patch.sport as string }));
    else if (patch.stat_name !== undefined) {
      setMarketRecheck((m) => Object.fromEntries(Object.entries(m).filter(([id]) => Number(id) !== pickId)));
    }
  };

  /** Rejects when the primary patch fails (row untouched) and when a sibling
   * fails (primary stays committed; the message names both). */
  const handlePatch = async (
    pickId: number,
    patch: PickPatchInput,
    okMessage: string,
    propagate = false,
    hint?: PickHint,
  ): Promise<void> => {
    setPending(true);
    try {
      const res = await patchPickFieldAction(pickId, patch);
      if (!res.ok) throw new Error(res.error);
      commit(pickId, patch, hint);

      const failed: string[] = [];
      const done: number[] = [];
      if (propagate && applyToSiblings) {
        for (const id of siblingIdsOfPick(pickId)) {
          const r = await patchPickFieldAction(id, patch);
          if (r.ok) {
            commit(id, patch, hint);
            done.push(id);
          } else failed.push(`#${id}: ${r.error}`);
        }
      }
      if (failed.length) {
        const msg = `Applied to #${[pickId, ...done].join(", #")}; failed on ${failed.join("; ")}`;
        show(msg);
        throw new Error(msg);
      }
      show(done.length ? `${okMessage} on #${[pickId, ...done].join(", #")}` : okMessage);
    } finally {
      setPending(false);
    }
  };

  /** Drops rows after a terminal action landed (regrade, grade, skip, delete). */
  const removeRows = (ids: number[]) => setRows((rs) => rs.filter((r) => !ids.includes(r.pick_id)));

  return { rows, fixed, marketRecheck, hints, pending, setPending, toast, show, removeRows, handlePatch };
}
