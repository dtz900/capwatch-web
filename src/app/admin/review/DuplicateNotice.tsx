"use client";

import { formatOdds } from "./reviewLabels";
import type { NoticeEntry } from "./useReviewActions";
import type { ReviewRow } from "./reviewRow";

interface Props {
  entries: NoticeEntry[];
  rows: ReviewRow[];
  pending: boolean;
  onApproveAnyway: (pickId: number) => void;
  onDismiss: () => void;
}

const BTN = "border rounded-md px-2.5 py-[3px] text-[11.5px] font-extrabold disabled:opacity-40";
const OK = `${BTN} border-[var(--color-border)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]`;

/** Stays on screen until dismissed: picks the API refused because the capper already has them live. */
export function DuplicateNotice({ entries, rows, pending, onApproveAnyway, onDismiss }: Props) {
  if (entries.length === 0) return null;
  const n = entries.length;
  return (
    <section
      role="alert"
      aria-label="Picks not approved because they are already live"
      className="flex-none max-h-[34vh] overflow-y-auto border-b border-[rgba(255,255,255,0.13)] px-6 py-3"
    >
      <div className="flex items-center gap-3">
        <div className="mr-auto text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[var(--color-text-muted)]">
          {n === 1 ? "Not approved: already live" : `${n} picks not approved: already live`}
        </div>
        <button type="button" className={OK} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      <p className="mt-1 text-[12px] font-semibold text-[var(--color-text-muted)]">
        Nothing was changed on {n === 1 ? "this pick" : "these picks"}. Use the second bet button only if the capper
        really placed it twice.
      </p>
      <div className="mt-2 border-t border-[var(--color-border)]">
        {entries.map((e) => {
          const row = rows.find((r) => r.pick_id === e.pickId);
          const link = e.tweetUrl && (
            <a
              href={e.tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-[var(--color-text-soft)] underline decoration-[rgba(255,255,255,0.13)] underline-offset-[3px] hover:text-[var(--color-text)]"
            >
              View tweet
            </a>
          );
          return (
            <div
              key={e.pickId}
              className="grid grid-cols-[1fr_auto] gap-4 items-center py-2 border-b border-[var(--color-border)]"
            >
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-bold">
                  {row?.selection ?? row?.market ?? "Untitled pick"}
                  {row?.odds_taken != null && (
                    <span className="ml-2 text-[var(--color-text-soft)] tabular-nums">{formatOdds(row.odds_taken)}</span>
                  )}
                  <span className="ml-2 text-[11.5px] font-semibold text-[var(--color-text-muted)] tabular-nums">
                    #{e.pickId}
                  </span>
                </div>
                <div className="mt-[2px] text-[12px] leading-[17px] font-semibold text-[var(--color-text-muted)]">
                  {e.existing ? (
                    <>
                      {e.sameBatch ? "Another copy in this same approval was kept" : "Already live"}
                      {e.existingPickId != null && ` as #${e.existingPickId}`}
                      {": "}
                      {e.existing}
                    </>
                  ) : (
                    e.reason
                  )}
                  {link && <> · {link}</>}
                </div>
                {e.differs && (
                  <div className="mt-[2px] text-[12px] leading-[17px] font-semibold text-[var(--color-text-soft)]">
                    {e.differs}
                  </div>
                )}
                {e.error && (
                  <div role="alert" className="mt-[2px] text-[12px] font-bold text-[var(--color-neg)]">
                    {e.error}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={OK}
                disabled={pending}
                onClick={(ev) => {
                  ev.currentTarget.blur();
                  onApproveAnyway(e.pickId);
                }}
              >
                Approve as a second bet
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
