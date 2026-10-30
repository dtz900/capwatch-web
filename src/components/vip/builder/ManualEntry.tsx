"use client";

/* "Bet not on the board": the structured leg editor, so an off-board leg
 * still carries the market fields the grader needs (free text cannot post). */

import { useState } from "react";
import { EMPTY_LEG, legToInput, parseLineField, type LegDraft } from "@/lib/legDraft";
import type { BoardSide, VipGameResult, VipSport } from "@/lib/vip/types";
import { LegEditor, inputCls, labelCls, optionCls } from "@/components/vip/LegEditor";
import { EYEBROW, INNER_CARD, SECONDARY_BTN_SM } from "@/components/vip/styles";
import { parsePrice } from "./odds";
import type { SlipLeg } from "./slip";

/** Everything the market needs is filled in, with a sane price. */
export function draftReady(leg: LegDraft): boolean {
  if (leg.selection.trim() === "" || leg.game === null || parsePrice(leg.odds) === null) return false;
  if (parseLineField(leg.line) === "invalid") return false;
  switch (leg.type) {
    case "spread":
      return leg.line.trim() !== "";
    case "total":
    case "team_runs":
      return leg.direction !== "" && leg.line.trim() !== "";
    case "custom":
      return leg.statName.trim() !== "";
    default:
      return true;
  }
}

let seq = 0;

/** The pick as subscribers get it: "NYY Under 4.5", "NYY -1.5", not just
 *  the selection the side and line were entered apart from. */
export function manualLabel(input: { selection: string; stat_name?: string | null;
                                     line?: number | null; direction?: string | null }): string {
  const sel = input.selection.trim();
  const dir = (input.direction ?? "").toLowerCase();
  const parts = [sel];
  if ((dir === "over" || dir === "under") && !/\b(over|under)\b/i.test(sel)) {
    parts.push(dir === "over" ? "Over" : "Under");
  }
  if (input.line != null && !sel.includes(String(Math.abs(input.line)))) {
    const spread = (input.stat_name ?? "").includes("spread");
    parts.push(spread && input.line > 0 ? `+${input.line}` : String(input.line));
  }
  return parts.join(" ");
}

export function draftToSlipLeg(d: LegDraft, sport: VipSport): SlipLeg {
  const price = parsePrice(d.odds) as number;
  // The slip posts its own price over this odds field.
  const input = legToInput(d, sport);
  const g = d.game as VipGameResult;
  const side: BoardSide = {
    key: `manual:${++seq}`,
    label: manualLabel(input),
    short: "",
    price,
    quotes: {},
    best: price,
    best_book: null,
    leg: {
      sport,
      game_id: String(g.game_pk),
      stat_name: input.stat_name ?? "",
      selection: input.selection,
      line: input.line ?? null,
      direction: (input.direction as "over" | "under" | null | undefined) ?? null,
      player_id: null,
      player_name: null,
    },
  };
  return {
    side,
    game: {
      sport, game_id: String(g.game_pk), away: g.away_team, home: g.home_team,
      commence_time: g.commence_time ?? null, started: false,
    },
    price: d.odds.trim(),
    american: price,
    edited: true,
    manual: input,
  };
}

export function ManualEntry({
  sports,
  token,
  onAdd,
  startOpen = false,
}: {
  sports: VipSport[];
  token: string;
  /** False when the slip could not take them; the drafts stay. */
  onAdd: (legs: SlipLeg[]) => boolean;
  /** MLB-only sellers have no board, so the editor is the whole builder. */
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [sport, setSport] = useState<VipSport>(sports[0]);
  const [drafts, setDrafts] = useState<LegDraft[]>([{ ...EMPTY_LEG }]);
  // Bumped after an add so the editor drops its game chips and filter.
  const [editorKey, setEditorKey] = useState(0);
  if (sports.length === 0) return null;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-[11px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
      >
        Bet not on the board?
      </button>
    );
  }
  const ready = drafts.every(draftReady);
  const reset = () => {
    setDrafts([{ ...EMPTY_LEG }]);
    setEditorKey((k) => k + 1);
  };
  return (
    <div className={`${INNER_CARD} flex flex-col gap-3`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={EYEBROW}>{startOpen ? "Build your pick" : "Bet not on the board"}</span>
        {sports.length > 1 && (
          <label className="flex items-center gap-2 ml-auto">
            <span className={labelCls}>Sport</span>
            <select
              aria-label="Sport"
              className={inputCls}
              value={sport}
              onChange={(e) => {
                setSport(e.target.value as VipSport);
                reset();
              }}
            >
              {sports.map((s) => (
                <option key={s} value={s} className={optionCls}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <LegEditor key={editorKey} sport={sport} legs={drafts} onChange={setDrafts} token={token} />
      <p className="text-[11px] text-[var(--color-text-muted)]">
        Goes out to subscribers right away. We check it before it counts on your record.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={SECONDARY_BTN_SM}
          disabled={!ready}
          onClick={() => {
            if (!onAdd(drafts.map((d) => draftToSlipLeg(d, sport)))) return;
            reset();
            if (!startOpen) setOpen(false);
          }}
        >
          Add to slip
        </button>
        {!startOpen && (
          <button type="button" className={SECONDARY_BTN_SM} onClick={() => setOpen(false)}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
