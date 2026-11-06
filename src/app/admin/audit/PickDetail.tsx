"use client";

import { useState } from "react";
import { ADMIN_SPORTS } from "@/lib/admin-sports";
import type { MarketDef, PickPatchInput } from "./actions";
import { FieldRow } from "./FieldRow";
import { fieldStates, isStrayNcaabProp, type FieldKey } from "./fieldState";
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
  onPatched: (pickId: number, patch: PickPatchInput) => void;
}

const KBD = "border border-[var(--color-border)] rounded px-[5px] text-[10px] font-bold text-[var(--color-text-soft)]";
const LBL = "text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[var(--color-text-muted)]";
const ROW = "grid grid-cols-[96px_1fr_auto] gap-3.5 items-center py-[11px] border-b border-[var(--color-border)]";

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
}: PickDetailProps) {
  const [open, setOpen] = useState<Partial<Record<FieldKey, boolean>>>({});
  const marketsError = typeof markets === "string" ? markets : null;
  const states = fieldStates(p, Array.isArray(markets) ? markets : null);
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
          <div className={ROW}>
            <div className={LBL}>Sport</div>
            <div className="inline-flex justify-self-start border border-[var(--color-border)] rounded-lg overflow-hidden">
              {ADMIN_SPORTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`px-[13px] py-1.5 text-[12px] font-extrabold ${
                    s === (p.sport ?? "MLB")
                      ? "bg-[var(--color-text)] text-[#0a0a0c]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
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
                  <div className="text-[11.5px] text-[var(--color-text-muted)]">Editor coming next</div>
                </FieldRow>
                {s.key === "market" && marketsError && (
                  <div className="py-2 pl-[110px] text-[12px] font-semibold text-[var(--color-text-muted)]">
                    Markets failed to load: {marketsError}
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
