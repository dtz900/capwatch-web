"use client";

import { useState } from "react";
import { Queue, type FooterCounts } from "./Queue";
import { REASON_LABEL, formatOdds, type QueueRow } from "./labels";

interface Props {
  problems: QueueRow[];
  footer: FooterCounts;
  recapDiffLabel: string;
  sportLabel: string;
  paging: { offset: number; pageSize: number; total: number };
  newerHref: string | null;
  olderHref: string | null;
}

export function Workbench({ problems, footer, recapDiffLabel, sportLabel, paging, newerHref, olderHref }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(problems[0]?.pick_id ?? null);
  const selected = problems.find((p) => p.pick_id === selectedId) ?? problems[0] ?? null;

  return (
    <div className="flex-1 min-h-0 grid grid-cols-[470px_1fr]">
      <Queue
        rows={problems}
        selectedId={selected?.pick_id ?? null}
        onSelect={setSelectedId}
        sportLabel={sportLabel}
        footer={footer}
        recapDiffLabel={recapDiffLabel}
        paging={paging}
        newerHref={newerHref}
        olderHref={olderHref}
      />
      <div className="overflow-y-auto min-w-0">
        {selected ? (
          <DetailPlaceholder row={selected} />
        ) : (
          <div className="px-8 py-[60px] text-[var(--color-text-muted)]">Queue clear.</div>
        )}
      </div>
    </div>
  );
}

/* Stand-in until PickDetail lands (Task 11): head block and the full tweet. */
function DetailPlaceholder({ row }: { row: QueueRow }) {
  return (
    <div className="max-w-[900px] w-full px-8 pt-[22px]">
      <div className="flex items-center gap-[14px]">
        <span className="bg-[var(--color-text)] text-[#0a0a0c] text-[10px] font-extrabold tracking-[0.06em] rounded-[5px] text-center py-[5px] w-[50px]">
          {row.sport ?? "MLB"}
        </span>
        <div className="min-w-0">
          <div className="text-[26px] font-extrabold tracking-[-0.02em] leading-[1.1]">
            {row.selection ?? row.market ?? "Untitled pick"}
            {row.odds_taken != null && (
              <span className="ml-2 text-[20px] font-bold text-[var(--color-text-soft)] tabular-nums">
                {formatOdds(row.odds_taken)}
              </span>
            )}
          </div>
          <div className="mt-[5px] text-[12.5px] font-semibold text-[var(--color-text-muted)]">
            <span className="font-extrabold text-[var(--color-neg)]">{REASON_LABEL[row.reason] ?? row.reason}</span>
            {" · "}
            {row.capper_display_name ?? row.capper_handle ?? "Unknown"}
            {row.capper_handle ? ` @${row.capper_handle}` : ""}
            {row.posted_label ? ` · posted ${row.posted_label}` : ""}
            {` · pick #${row.pick_id}`}
          </div>
        </div>
      </div>
      {row.tweet_text && (
        <div className="mt-[18px] py-[14px] pl-4 border-l-2 border-[rgba(255,255,255,0.13)]">
          <p className="text-[15.5px] leading-[1.5] font-semibold whitespace-pre-wrap">{row.tweet_text}</p>
          {row.tweet_url && (
            <div className="mt-2 text-[12px] font-semibold text-[var(--color-text-muted)]">
              The tweet, in full.{" "}
              <a
                href={row.tweet_url}
                target="_blank"
                rel="noreferrer"
                className="font-extrabold text-[var(--color-text-soft)] underline"
              >
                Open on X
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
