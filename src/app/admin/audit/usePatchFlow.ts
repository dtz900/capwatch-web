"use client";

import { useEffect, useRef, useState } from "react";
import { patchPickFieldAction, type PickPatchInput } from "./actions";
import type { FieldKey } from "./fieldState";
import type { QueueRow } from "./labels";
import { gameSiblings, playerSiblings } from "./siblings";
import type { GameTeams } from "./teamMatch";

/** What an editor learned from a pick: used for the local row copy and the game sort. */
export interface PickHint {
  team?: string | null;
  name?: string;
  gameDate?: string | null;
  /** The teams of a chosen game, so a game patch only reaches the siblings on it. */
  game?: GameTeams;
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
  // An edit to what defines a duplicate (sport, game, player, market, selection, line) makes the
  // loaded live_twin stale, and neither the PATCH nor this page refetches it. A missing marker is
  // acceptable until the queue reloads; a wrong one is not. Odds and units do not change identity.
  const identityEdit =
    patch.sport !== undefined ||
    patch.game_id !== undefined ||
    patch.player_id !== undefined ||
    patch.stat_name !== undefined ||
    patch.selection !== undefined ||
    patch.line !== undefined;
  if (identityEdit && (next as { live_twin?: unknown }).live_twin != null) {
    (next as { live_twin?: unknown }).live_twin = null;
  }
  return next;
}

export function usePatchFlow(problems: QueueRow[], applyToSiblings: boolean, selectedId: number | null = null) {
  const [rows, setRows] = useState(problems);
  const [fixed, setFixed] = useState<Record<number, FieldKey[]>>({});
  const [marketRecheck, setMarketRecheck] = useState<Record<number, string>>({});
  const [patchedSiblings, setPatchedSiblings] = useState<ReadonlySet<number>>(new Set());
  const [hints, setHints] = useState<Record<number, PickHint>>({});
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resync only when the set of picks changes; rows already held keep their local commits.
  const [seen, setSeen] = useState(problems);
  if (seen !== problems) {
    setSeen(problems);
    const idKey = (rs: QueueRow[]) => rs.map((r) => r.pick_id).join(",");
    if (idKey(problems) !== idKey(rows)) {
      const local = new Map(rows.map((r) => [r.pick_id, r]));
      const next = problems.map((r) => local.get(r.pick_id) ?? r);
      // The pick being worked on stays until a terminal action removes it, even
      // if the server now files it elsewhere (a bind can reclassify it).
      const held = selectedId == null ? undefined : local.get(selectedId);
      if (held && !next.some((r) => r.pick_id === held.pick_id)) {
        const at = rows.findIndex((r) => r.pick_id === held.pick_id);
        next.splice(Math.min(Math.max(at, 0), next.length), 0, held);
      }
      setRows(next);
    }
  }
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  /** Only a player patch and a game patch propagate, each to the siblings it fits. */
  const siblingsToPatch = (id: number, patch: PickPatchInput, hint: PickHint | undefined): number[] => {
    const row = rowsRef.current.find((r) => r.pick_id === id);
    if (!row) return [];
    if (patch.player_id !== undefined) return playerSiblings(rowsRef.current, row).map((r) => r.pick_id);
    if (patch.game_id !== undefined && hint?.game) {
      return gameSiblings(rowsRef.current, row, hint.game).map((r) => r.pick_id);
    }
    return [];
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
    if (patch.sport !== undefined) {
      setHints((h) => ({ ...h, [pickId]: { ...h[pickId], game: undefined } }));
      setMarketRecheck((m) => ({ ...m, [pickId]: patch.sport as string }));
    } else if (patch.stat_name !== undefined) {
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
      const sibs = propagate && applyToSiblings ? siblingsToPatch(pickId, patch, hint) : [];
      const res = await patchPickFieldAction(pickId, patch);
      if (!res.ok) throw new Error(res.error);
      commit(pickId, patch, hint);

      const failed: string[] = [];
      const done: number[] = [];
      for (const id of sibs) {
        const r = await patchPickFieldAction(id, patch);
        if (r.ok) {
          commit(id, patch, hint);
          done.push(id);
          setPatchedSiblings((s) => new Set(s).add(id));
        } else failed.push(`#${id}: ${r.error}`);
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

  return { rows, patchedSiblings, fixed, marketRecheck, hints, pending, setPending, toast, show, removeRows, handlePatch };
}
