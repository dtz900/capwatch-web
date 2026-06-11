"use client";

import { useEffect, useRef } from "react";
import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
import { HistoryRow, DESKTOP_GRID } from "@/components/capper/HistoryRow";

/** Append-style pick history. Auto-fires load-more when a sentinel near the
 * bottom scrolls into view, with a manual "Load more" button as the accessible
 * / observer-unsupported fallback. Bound to the filter context. */
export function HistoryList() {
  const { history, historyTotal, loadingHistory, hasMore, loadMore } = useCapperFilters();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore, history.length]);

  if (historyTotal === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-10 text-center text-[13px] text-[var(--color-text-muted)] italic">
        No picks match these filters.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
      <div
        className={`${DESKTOP_GRID} pl-[19px] pr-5 py-3 border-b border-[var(--color-border)]
                    text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)]`}
      >
        <div>Date</div>
        <div>Selection</div>
        <div className="text-right">Line</div>
        <div className="text-right">Odds</div>
        <div className="text-right">Units</div>
        <div
          className="text-right"
          title="Profit excludes prop picks where the capper did not post odds. Those picks count toward Win % but not units."
        >
          Profit<sup className="ml-0.5 text-[var(--color-text-muted)]">*</sup>
        </div>
        <div></div>
      </div>

      {history.map((p, i) => (
        <HistoryRow key={p.id} pick={p} isLast={i === history.length - 1} />
      ))}

      <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] font-medium">
        <div>
          Showing {history.length} of {historyTotal}
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                       bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]
                       text-[var(--color-text-soft)] hover:text-[var(--color-text)]
                       text-[11px] font-bold tracking-[0.02em] transition-colors disabled:opacity-50"
          >
            {loadingHistory ? "Loading..." : "Load more"}
          </button>
        )}
      </div>

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </div>
  );
}
