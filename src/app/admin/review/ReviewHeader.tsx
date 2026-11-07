"use client";

interface Props {
  held: number;
  pickShaped: number;
  blocked: number | null;
  decided: number;
  selectedCount: number;
  visibleCount: number;
  pending: boolean;
  onApproveSelected: () => void;
  onRejectSelected: () => void;
  onClear: () => void;
  onSelectAll: () => void;
}

const fmt = (n: number) => n.toLocaleString("en-US");

function Mini({ n, children }: { n: number; children: string }) {
  return (
    <div className="text-[12px] font-semibold text-[var(--color-text-muted)]">
      <b className="mr-[5px] font-extrabold text-[var(--color-text-soft)] tabular-nums">{fmt(n)}</b>
      {children}
    </div>
  );
}

const btn =
  "rounded-lg border border-[rgba(255,255,255,0.13)] px-[13px] py-[7px] text-[12.5px] font-bold text-[var(--color-text-soft)] hover:text-[var(--color-text)] disabled:opacity-50";

const kbd =
  "rounded border border-[var(--color-border)] px-[5px] py-px text-[10.5px] font-bold text-[var(--color-text-soft)]";

export function ReviewHeader({
  held,
  pickShaped,
  blocked,
  decided,
  selectedCount,
  visibleCount,
  pending,
  onApproveSelected,
  onRejectSelected,
  onClear,
  onSelectAll,
}: Props) {
  return (
    <div className="flex-none flex items-center gap-7 px-6 py-[14px] border-b border-[var(--color-border)]">
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Review queue</h1>
      <div className="flex items-baseline gap-2">
        <b className="text-[30px] font-extrabold tracking-[-0.03em] leading-none tabular-nums">{fmt(held)}</b>
        <span className="text-[12px] font-bold text-[var(--color-text-soft)]">held for you</span>
      </div>
      <div className="flex gap-[22px]">
        <Mini n={pickShaped}>pick-shaped rejects, 7 days</Mini>
        <Mini n={decided}>decided tonight</Mini>
        {blocked != null && blocked > 0 && <Mini n={blocked}>blocked lookups</Mini>}
      </div>
      <div className="ml-auto flex items-center gap-[10px]">
        {selectedCount > 0 ? (
          <>
            <span className="mr-1 text-[12px] font-bold text-[var(--color-text-soft)] tabular-nums">
              {selectedCount} selected
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={onApproveSelected}
              className={`${btn} border-[var(--color-pos)] text-[var(--color-pos)]`}
            >
              Approve selected
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onRejectSelected}
              className={`${btn} border-[var(--color-neg)] text-[var(--color-neg)]`}
            >
              Reject selected
            </button>
            <button type="button" onClick={onClear} className={btn}>
              Clear
            </button>
          </>
        ) : (
          <>
            <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">
              <kbd className={kbd}>Space</kbd> selects a row, <kbd className={kbd}>Shift</kbd>+
              <kbd className={kbd}>Space</kbd> its whole tweet
            </span>
            <button type="button" disabled={visibleCount === 0} onClick={onSelectAll} className={btn}>
              Select all {visibleCount}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
