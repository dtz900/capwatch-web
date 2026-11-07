"use client";

interface Props {
  canApprove: boolean;
  /** The game started before the tweet was posted. */
  started: boolean;
  pending: boolean;
  selected: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSkip: () => void;
  onToggleSelect: () => void;
  message: string | null;
}

const KBD =
  "ml-[7px] border border-[var(--color-border)] rounded px-[5px] text-[10px] font-bold text-[var(--color-text-soft)]";
const BTN =
  "border border-[rgba(255,255,255,0.13)] rounded-lg px-3 py-[7px] text-[12px] font-extrabold text-[var(--color-text-soft)] hover:text-[var(--color-text)] disabled:opacity-50";

export function statusCopy(canApprove: boolean, started: boolean): string {
  if (canApprove && started) return "Started before the tweet. Reject unless it is a priced live bet.";
  if (canApprove) return "Approve puts it on the public record and locks it.";
  return "Set the game first, or reject.";
}

const blurThen = (fn: () => void) => (e: { currentTarget: HTMLButtonElement }) => {
  e.currentTarget.blur();
  fn();
};

export function ReviewActionStrip({
  canApprove,
  started,
  pending,
  selected,
  onApprove,
  onReject,
  onSkip,
  onToggleSelect,
  message,
}: Props) {
  const on = canApprove && !pending;
  return (
    <div className="sticky bottom-0 mt-auto bg-[var(--color-bg)] border-t border-[rgba(255,255,255,0.13)] px-8 py-[13px] flex items-center gap-3 flex-wrap">
      <button
        type="button"
        disabled={!on}
        onClick={blurThen(onApprove)}
        className={`rounded-lg px-[13px] py-[7px] text-[12px] font-extrabold border ${
          on
            ? "bg-[var(--color-text)] text-[#0a0a0c] border-[var(--color-text)]"
            : "bg-transparent text-[var(--color-text-muted)] border-[rgba(255,255,255,0.13)]"
        }`}
      >
        Approve
        <kbd className={KBD}>Enter</kbd>
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={blurThen(onReject)}
        className="rounded-lg px-[13px] py-[7px] text-[12px] font-extrabold border text-[var(--color-neg)] border-[rgba(239,68,68,0.45)] disabled:opacity-50"
      >
        Reject
        <kbd className={KBD}>R</kbd>
      </button>
      <span className="text-[12px] font-bold text-[var(--color-text-muted)]">{statusCopy(canApprove, started)}</span>
      {message && (
        <span role="alert" className="text-[12px] font-bold text-[var(--color-neg)]">
          {message}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button type="button" disabled={pending} onClick={blurThen(onSkip)} className={BTN}>
          Skip
          <kbd className={KBD}>J</kbd>
        </button>
        <button type="button" disabled={pending} onClick={blurThen(onToggleSelect)} className={BTN}>
          {selected ? "Unselect" : "Select"}
          <kbd className={KBD}>Space</kbd>
        </button>
      </div>
    </div>
  );
}
