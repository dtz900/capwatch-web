"use client";
import { useState } from "react";
import { useBetSlip } from "@/components/my-tails/BetSlipContext";
import { SlipEntryRow } from "@/components/my-tails/BetSlipRail";
import { VipTeaser } from "@/components/capper/VipTeaser";

function unitsStr(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}u`;
}

/** Right-edge slide-out bet slip for mobile. The page renders this inside
    an lg:hidden wrapper; desktop uses BetSlipRail instead. */
export function BetSlipDrawer() {
  const slip = useBetSlip();
  const [open, setOpen] = useState(false);
  if (!slip) return null;
  const { entries, totals, removeEntry, updateEntry, teaserOpen, closeTeaser } = slip;
  const count = entries?.length ?? 0;
  return (
    <>
      <button
        aria-label={`Open bet slip, ${totals.pending} pending`}
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/3 z-40 bg-[#0f0f14] border border-r-0 border-[var(--color-border)] px-1.5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-soft)] [writing-mode:vertical-rl]"
      >
        SLIP{count > 0 ? ` · ${count}` : ""}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[320px] max-w-[90vw] bg-[#0f0f14] border-l border-[var(--color-border)] transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between bg-[#0f0f14] border-b border-[var(--color-border)] px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            MY BET SLIP{totals.pending > 0 ? ` · ${totals.pending} pending` : ""}
          </span>
          <button
            aria-label="Close bet slip"
            onClick={() => setOpen(false)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm"
          >
            {"✕"}
          </button>
        </div>
        {open && (
          <div className="h-[calc(100%-45px)] overflow-y-auto px-4 pb-6">
            {teaserOpen && (
              <div className="mt-3" onClick={closeTeaser}>
                <VipTeaser />
              </div>
            )}
            {entries !== null && entries.length === 0 && (
              <p className="py-3 text-xs text-[var(--color-text-muted)]">
                Tap a pick on any card to log it here. It grades itself.
              </p>
            )}
            {entries !== null && entries.length > 0 && (
              <>
                <ul>
                  {entries.map((e) => (
                    <SlipEntryRow key={e.id} entry={e} onRemove={removeEntry} onUpdate={updateEntry} />
                  ))}
                </ul>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                      Today
                    </div>
                    <div
                      className={`text-[22px] leading-none font-extrabold tabular-nums ${
                        totals.today >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
                      }`}
                    >
                      {unitsStr(totals.today)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                      All time
                    </div>
                    <div
                      className={`text-[22px] leading-none font-extrabold tabular-nums ${
                        totals.allTime >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
                      }`}
                    >
                      {unitsStr(totals.allTime)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
