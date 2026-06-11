"use client";

import Link from "next/link";
import { ChevronIcon } from "@/components/icons/ChevronIcon";
import type { HistoryPick } from "@/lib/types";
import { HistoryRow, DESKTOP_GRID } from "@/components/capper/HistoryRow";

const PAGE_SIZE = 25;

export function HistoryTable({
  history,
  total,
  offset,
  basePath,
  query,
}: {
  history: HistoryPick[];
  total: number;
  offset: number;
  basePath: string;
  query: URLSearchParams;
}) {
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-10 text-center text-[13px] text-[var(--color-text-muted)] italic">
        No picks match these filters.
      </div>
    );
  }

  const prevOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  const showingFrom = offset + 1;
  const showingTo = Math.min(offset + history.length, total);

  const pageQuery = (newOffset: number) => {
    const params = new URLSearchParams(query.toString());
    if (newOffset === 0) params.delete("offset");
    else params.set("offset", String(newOffset));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
      <div
        className={`${DESKTOP_GRID} pl-[19px] pr-5 py-3
                    border-b border-[var(--color-border)]
                    text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)]`}
      >
        <div>Date</div>
        <div>Selection</div>
        <div className="text-right">Line</div>
        <div className="text-right">Odds</div>
        <div className="text-right">Units</div>
        <div className="text-right" title="Profit excludes prop picks where the capper did not post odds. Those picks count toward Win % but not units.">
          Profit<sup className="ml-0.5 text-[var(--color-text-muted)]">*</sup>
        </div>
        <div></div>
      </div>
      {history.map((p, i) => (
        <HistoryRow key={p.id} pick={p} isLast={i === history.length - 1} />
      ))}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--color-border)]
                      text-[11px] text-[var(--color-text-muted)] font-medium">
        <div>
          Showing {showingFrom}-{showingTo} of {total}
        </div>
        <div className="flex items-center gap-2">
          {offset > 0 && (
            <Link
              href={pageQuery(prevOffset)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                         bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]
                         text-[var(--color-text-soft)] hover:text-[var(--color-text)]
                         text-[11px] font-bold tracking-[0.02em] transition-colors"
            >
              <ChevronIcon size={11} className="rotate-90" />
              Newer
            </Link>
          )}
          {nextOffset < total && (
            <Link
              href={pageQuery(nextOffset)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                         bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]
                         text-[var(--color-text-soft)] hover:text-[var(--color-text)]
                         text-[11px] font-bold tracking-[0.02em] transition-colors"
            >
              Older
              <ChevronIcon size={11} className="-rotate-90" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
