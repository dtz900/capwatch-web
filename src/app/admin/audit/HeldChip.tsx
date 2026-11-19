import { reasonLabel } from "../review/reviewLabels";

/** Same chip shape as the review queue's "Already live" chip, in the soft text color. */
export function HeldChip() {
  return (
    <span className="flex-none rounded-[4px] border border-[var(--color-border)] px-[5px] py-px text-[9.5px] leading-[14px] font-extrabold tracking-[0.06em] uppercase text-[var(--color-text-soft)]">
      Held
    </span>
  );
}

/** The hold reason, worded the way the review page words it. Nothing when none was recorded. */
export function heldReasonText(reason: string | null | undefined): string | null {
  const why = reasonLabel(reason ?? null);
  return why.soft ? null : why.text;
}
