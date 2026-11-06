"use client";

import type { GradeOutcome } from "./useAuditKeys";

export interface PrimaryState {
  label: "Save and regrade" | "Regrade";
  enabled: boolean;
  remaining: number;
}

interface Props {
  primary: PrimaryState;
  pending: boolean;
  /** NCAAB prop that should not exist: only Skip and Delete apply. */
  strayProp?: boolean;
  skipLabel?: "Skip" | "Unskip";
  onRegrade: () => void;
  onGrade: (outcome: GradeOutcome) => void;
  onSkip: () => void;
  onDelete: () => void;
  message: string | null;
}

const KBD =
  "ml-[7px] border border-[var(--color-border)] rounded px-[5px] text-[10px] font-bold text-[var(--color-text-soft)]";
const BTN =
  "border border-[rgba(255,255,255,0.13)] rounded-lg px-3 py-[7px] text-[12px] font-extrabold text-[var(--color-text-soft)] disabled:opacity-50";

const GRADES: Array<{ outcome: GradeOutcome; label: string; key: string; hover: string }> = [
  { outcome: "win", label: "Win", key: "W", hover: "hover:border-[var(--color-pos)] hover:text-[var(--color-pos)]" },
  { outcome: "loss", label: "Loss", key: "L", hover: "hover:border-[var(--color-neg)] hover:text-[var(--color-neg)]" },
  { outcome: "push", label: "Push", key: "P", hover: "hover:text-[var(--color-text)]" },
  { outcome: "void", label: "Void", key: "V", hover: "hover:text-[var(--color-text)]" },
];

export function ActionStrip({
  primary,
  pending,
  strayProp = false,
  skipLabel = "Skip",
  onRegrade,
  onGrade,
  onSkip,
  onDelete,
  message,
}: Props) {
  const status = strayProp
    ? "NCAAB props are not tracked."
    : primary.remaining > 0
      ? `${primary.remaining} thing${primary.remaining === 1 ? "" : "s"} left to fix`
      : "Ready. Enter to save and move to the next one.";
  const primaryOn = primary.enabled && !pending;

  return (
    <div className="sticky bottom-0 mt-auto bg-[var(--color-bg)] border-t border-[rgba(255,255,255,0.13)] px-8 py-[13px] flex items-center gap-3 flex-wrap">
      {!strayProp && (
        <button
          type="button"
          disabled={!primaryOn}
          onClick={onRegrade}
          className={`rounded-lg px-[13px] py-[7px] text-[12px] font-extrabold border ${
            primaryOn
              ? "bg-[var(--color-text)] text-[#0a0a0c] border-[var(--color-text)]"
              : "bg-transparent text-[var(--color-text-muted)] border-[rgba(255,255,255,0.13)]"
          }`}
        >
          {primary.label}
        </button>
      )}
      <span className="text-[12px] font-bold text-[var(--color-text-muted)]">{status}</span>
      {message && (
        <span role="alert" className="text-[12px] font-bold text-[var(--color-neg)]">
          {message}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        {!strayProp && (
          <>
            <span className="text-[10.5px] font-extrabold tracking-[0.14em] text-[var(--color-text-muted)] mr-1">
              OR GRADE BY HAND
            </span>
            {GRADES.map((g) => (
              <button
                key={g.outcome}
                type="button"
                disabled={pending}
                onClick={() => onGrade(g.outcome)}
                className={`${BTN} ${g.hover}`}
              >
                {g.label}
                <kbd className={KBD}>{g.key}</kbd>
              </button>
            ))}
            <span className="w-px h-[22px] bg-[rgba(255,255,255,0.13)] mx-1" />
          </>
        )}
        <button type="button" disabled={pending} onClick={onSkip} className={`${BTN} hover:text-[var(--color-text)]`}>
          {skipLabel}
          <kbd className={KBD}>A</kbd>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className={`${BTN} text-[var(--color-neg)] hover:border-[var(--color-neg)]`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
