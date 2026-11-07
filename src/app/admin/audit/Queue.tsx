import Link from "next/link";
import type { ReactNode } from "react";
import type { BucketKind } from "./BucketList";
import { REASON_LABEL, emptyQueueCopy, formatOdds, type QueueRow } from "./labels";

export interface FooterCounts {
  settled: number;
  pending: number;
  triaged: number;
  ungradedFinal: number;
  pickShaped: number;
}

interface Props {
  rows: QueueRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  sportLabel: string;
  footer: FooterCounts;
  recapDiffLabel: string;
  /** Find-by-id mode: only that pick is listed and paging is hidden. */
  pickId?: number;
  paging: { offset: number; pageSize: number; total: number };
  newerHref: string | null;
  olderHref: string | null;
  /** When set, replaces the row list (a footer bucket is open). */
  bucket: ReactNode | null;
  activeBucket: BucketKind | null;
  onOpenBucket: (kind: BucketKind) => void;
}

export function Queue({
  rows,
  selectedId,
  onSelect,
  sportLabel,
  footer,
  recapDiffLabel,
  paging,
  pickId,
  newerHref,
  olderHref,
  bucket,
  activeBucket,
  onOpenBucket,
}: Props) {
  const from = paging.offset + 1;
  const to = Math.min(paging.offset + rows.length, paging.total);
  const buckets: Array<[BucketKind, string, number]> = [
    ["settled", "Settled, no action needed", footer.settled],
    ["pending", "Pending, will grade themselves", footer.pending],
    ["triaged", "Triaged, hidden", footer.triaged],
    ["ungraded_final", "Ungraded on a final game", footer.ungradedFinal],
    ["pick_shaped", "Pick-shaped rejects", footer.pickShaped],
  ];
  return (
    <div className="border-r border-[var(--color-border)] flex flex-col min-h-0 h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
      {!bucket && pickId !== undefined && (
        <div className="flex items-center justify-between px-[22px] py-[10px] border-b border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-muted)]">
          <span>
            {rows.length > 0 ? `Showing pick #${pickId} only` : `No pick #${pickId} found`}
          </span>
          <Link href="/admin/audit" className="font-bold text-[var(--color-text-soft)] hover:text-[var(--color-text)]">
            Clear
          </Link>
        </div>
      )}
      {bucket ? (
        bucket
      ) : rows.length === 0 ? (
        <div className="px-[22px] py-[60px] text-center text-[var(--color-text-muted)]">
          {pickId !== undefined ? `No pick #${pickId} found.` : emptyQueueCopy(sportLabel)}
        </div>
      ) : (
        rows.map((r) => {
          const on = r.pick_id === selectedId;
          return (
            <button
              key={r.pick_id}
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onSelect(r.pick_id);
              }}
              aria-current={on ? "true" : undefined}
              className={`relative w-full grid grid-cols-[50px_1fr_auto] gap-3 items-center pl-[22px] pr-[18px] py-3 border-b border-[var(--color-border)] text-left hover:bg-[rgba(255,255,255,0.02)] ${
                on ? "bg-[rgba(247,243,233,0.055)]" : ""
              }`}
            >
              {on && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-text)]" />}
              <span className="bg-[var(--color-text)] text-[#0a0a0c] text-[10px] font-extrabold tracking-[0.06em] rounded-[5px] text-center py-[5px] w-[50px]">
                {r.sport ?? "?"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] leading-[19px] font-extrabold">
                  {r.selection ?? r.market ?? "Untitled pick"}
                  {r.odds_taken != null && (
                    <span className="ml-[6px] font-bold text-[var(--color-text-soft)] tabular-nums">
                      {formatOdds(r.odds_taken)}
                    </span>
                  )}
                </span>
                <span className="block mt-[3px] text-[11.5px] leading-[16px] font-semibold text-[var(--color-text-muted)] truncate">
                  <span className="font-extrabold text-[var(--color-neg)]">{REASON_LABEL[r.reason] ?? r.reason}</span>
                  {" · "}
                  {r.capper_display_name ?? r.capper_handle ?? "Unknown"}
                </span>
              </span>
              <span className="text-right text-[11px] font-semibold text-[var(--color-text-muted)] tabular-nums">
                <span className="block">{r.posted_label ?? ""}</span>
                <span className="block">#{r.pick_id}</span>
              </span>
            </button>
          );
        })
      )}

      {!bucket && pickId === undefined && (rows.length > 0 || newerHref || olderHref) && (
        <div className="flex items-center justify-between px-[22px] py-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
          <span>
            {rows.length > 0 ? `Showing ${from}-${to} of ${paging.total}` : `Nothing at this offset (${paging.total} total)`}
          </span>
          <span className="flex gap-3 font-bold text-[var(--color-text-soft)]">
            {newerHref && <Link href={newerHref}>Newer</Link>}
            {olderHref && <Link href={olderHref}>Older</Link>}
          </span>
        </div>
      )}
      </div>

      <div className="flex-none border-t border-[var(--color-border)]">
        {buckets.map(([kind, label, n]) => (
          <button
            key={kind}
            type="button"
            aria-pressed={activeBucket === kind}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenBucket(kind);
            }}
            className={`flex w-full justify-between px-[22px] py-[11px] text-[12px] font-bold border-b border-[var(--color-border)] hover:text-[var(--color-text-soft)] ${
              activeBucket === kind ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"
            }`}
          >
            <span>{label}</span>
            <b className="font-bold text-[var(--color-text-soft)] tabular-nums">{n.toLocaleString("en-US")} ›</b>
          </button>
        ))}
        <div className="px-[22px] py-[10px] text-[11px] font-medium text-[var(--color-text-muted)]">
          {recapDiffLabel}
        </div>
      </div>
    </div>
  );
}
