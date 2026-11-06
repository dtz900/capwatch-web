"use client";

import { useState } from "react";
import type { MarketDef, PickPatchInput } from "./actions";
import { GameEditor } from "./editors/GameEditor";
import { MarketEditor } from "./editors/MarketEditor";
import { PlayerEditor } from "./editors/PlayerEditor";
import { needsSide, SideEditor, useBoundGame } from "./editors/SideEditor";
import { SportEditor } from "./editors/SportEditor";
import { TextEditor } from "./editors/TextEditor";
import type { PickHint } from "./usePatchFlow";
import { FieldRow, LABEL_CLASS, ROW_CLASS } from "./FieldRow";
import { effectiveStates, isStrayNcaabProp, type FieldKey } from "./fieldState";
import { REASON_LABEL, formatOdds, type QueueRow } from "./labels";
import { TweetBlock } from "./TweetBlock";

export interface PickDetailProps {
  p: QueueRow;
  index: number;
  total: number;
  /** Array when loaded, null while loading, or the error string. */
  markets: MarketDef[] | null | string;
  siblingIds: number[];
  /** The sibling rows themselves, for the checkbox copy. */
  siblingRows: QueueRow[];
  applyToSiblings: boolean;
  setApplyToSiblings: (v: boolean) => void;
  /** Fields fixed this session (shown as Fixed, no longer red). */
  fixedKeys: FieldKey[];
  /** Set to the new sport after a sport change until a market is picked. */
  marketRecheck: string | null;
  hint: PickHint | undefined;
  pending: boolean;
  onPatch: (patch: PickPatchInput, okMessage: string, propagate?: boolean) => Promise<void>;
}

const KBD = "border border-[var(--color-border)] rounded px-[5px] text-[10px] font-bold text-[var(--color-text-soft)]";

function siblingCopy(ids: number[], rows: QueueRow[]): string {
  const first = rows[0];
  if (ids.length === 1 && first) {
    const what = `${first.selection ?? first.market ?? "pick"} ${formatOdds(first.odds_taken)}`.trim();
    return `Same tweet also made pick #${first.pick_id} (${what}). Apply player and game to both.`;
  }
  return `Same tweet also made picks ${ids.map((id) => `#${id}`).join(", ")}. Apply player and game to all.`;
}

export function PickDetail({
  p,
  index,
  total,
  markets,
  siblingIds,
  siblingRows,
  applyToSiblings,
  setApplyToSiblings,
  fixedKeys,
  marketRecheck,
  hint,
  pending,
  onPatch,
}: PickDetailProps) {
  const [open, setOpen] = useState<Partial<Record<FieldKey, boolean>>>({});
  const { game: boundGame, error: sideError } = useBoundGame(p);
  const states = effectiveStates(p, Array.isArray(markets) ? markets : null, fixedKeys, marketRecheck);
  const ed = { p, disabled: pending, onPatch };
  const editorFor = (k: FieldKey) => {
    switch (k) {
      case "player":
        return <PlayerEditor {...ed} />;
      case "game":
        return <GameEditor {...ed} pickedTeam={hint?.team ?? null} />;
      case "market":
        return <MarketEditor {...ed} markets={markets} />;
      case "line":
        return <TextEditor {...ed} field="line" />;
      case "odds":
        return <TextEditor {...ed} field="odds_taken" />;
      case "stake":
        return <TextEditor {...ed} field="units" />;
    }
  };
  const toggle = (k: FieldKey) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  return (
    <div className="max-w-[900px] w-full px-8 pt-[22px] pb-10">
      <div className="flex items-center gap-[14px]">
        <span className="bg-[var(--color-text)] text-[#0a0a0c] text-[10px] font-extrabold tracking-[0.06em] rounded-[5px] text-center py-[5px] w-[50px]">
          {p.sport ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[26px] font-extrabold tracking-[-0.02em] leading-[1.1]">
            {p.selection ?? p.market ?? "Untitled pick"}
            {p.odds_taken != null && (
              <span className="ml-2 text-[20px] font-bold text-[var(--color-text-soft)] tabular-nums">
                {formatOdds(p.odds_taken)}
              </span>
            )}
          </div>
          <div className="mt-[5px] text-[12.5px] font-semibold text-[var(--color-text-muted)]">
            <span className="font-extrabold text-[var(--color-neg)]">{REASON_LABEL[p.reason] ?? p.reason}</span>
            {" · "}
            {p.capper_display_name ?? p.capper_handle ?? "Unknown"}
            {p.capper_handle ? ` @${p.capper_handle}` : ""}
            {p.posted_label ? ` · posted ${p.posted_label}` : ""}
            {` · pick #${p.pick_id}`}
            {p.parlay_id != null ? ` · parlay #${p.parlay_id}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-text-muted)]">
          <span>{`${index + 1} of ${total}`}</span>
          <kbd className={KBD}>K</kbd>
          <kbd className={KBD}>J</kbd>
        </div>
      </div>

      <TweetBlock p={p} />

      {siblingIds.length > 0 && (
        <label className="mt-3 flex gap-[9px] items-center text-[12.5px] font-semibold text-[var(--color-text-soft)]">
          <input
            type="checkbox"
            className="accent-[#f7f3e9]"
            checked={applyToSiblings}
            onChange={(e) => setApplyToSiblings(e.target.checked)}
          />
          {siblingCopy(siblingIds, siblingRows)}
        </label>
      )}

      {isStrayNcaabProp(p) ? (
        <div className="mt-5 pt-4 border-t border-[var(--color-border)] text-[14px] font-bold text-[var(--color-neg)]">
          NCAAB props are not tracked. This pick should not exist.
        </div>
      ) : (
        <div className="mt-5 border-t border-[var(--color-border)]">
          <div className={ROW_CLASS}>
            <div className={LABEL_CLASS}>Sport</div>
            <SportEditor {...ed} />
            <span className="text-[11.5px] font-semibold text-[var(--color-text-muted)]">
              Rosters, games and markets follow this
            </span>
          </div>
          {markets === null ? (
            <div className="py-[11px] text-[12px] font-semibold text-[var(--color-text-muted)]">
              Loading markets...
            </div>
          ) : (
            states.map((s) => (
              <div key={s.key}>
                <FieldRow state={s} open={!!open[s.key]} onToggle={() => toggle(s.key)}>
                  {editorFor(s.key)}
                </FieldRow>
                {s.key === "game" && (sideError || needsSide(p.selection, boundGame)) && (
                  <div className={ROW_CLASS}>
                    <div className={LABEL_CLASS}>Side</div>
                    <div className="min-w-0 col-span-2">
                      {sideError ? (
                        <div className="text-[12px] font-semibold text-[var(--color-neg)] opacity-80">
                          Side check failed: {sideError}
                        </div>
                      ) : (
                        needsSide(p.selection, boundGame) && <SideEditor {...ed} game={boundGame} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
