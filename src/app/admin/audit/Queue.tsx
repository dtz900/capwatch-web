import Link from "next/link";
import { REASON_LABEL, formatOdds, type QueueRow } from "./labels";

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
  paging: { offset: number; pageSize: number; total: number };
  newerHref: string | null;
  olderHref: string | null;
}

export function Queue({
  rows,
  selectedId,
  onSelect,
  sportLabel,
  footer,
  recapDiffLabel,
  paging,
  newerHref,
  olderHref,
}: Props) {
  const from = paging.offset + 1;
  const to = Math.min(paging.offset + rows.length, paging.total);
  const buckets: Array<[string, number]> = [
    ["Settled, no action needed", footer.settled],
    ["Pending, will grade themselves", footer.pending],
    ["Triaged, hidden", footer.triaged],
    ["Ungraded on a final game", footer.ungradedFinal],
    ["Pick-shaped rejects", footer.pickShaped],
  ];
  return (
    <div className="border-r border-[var(--color-border)] overflow-y-auto flex flex-col min-h-0">
      {rows.length === 0 ? (
        <div className="px-[22px] py-[60px] text-center text-[var(--color-text-muted)]">
          Nothing needs you in {sportLabel}.
        </div>
      ) : (
        rows.map((r) => {
          const on = r.pick_id === selectedId;
          return (
            <button
              key={r.pick_id}
              type="button"
              onClick={() => onSelect(r.pick_id)}
              className={`relative w-full grid grid-cols-[50px_1fr_auto] gap-3 items-center pl-[22px] pr-[18px] py-3 border-b border-[var(--color-border)] text-left hover:bg-[rgba(255,255,255,0.02)] ${
                on ? "bg-[rgba(247,243,233,0.055)]" : ""
              }`}
            >
              {on && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-text)]" />}
              <span className="bg-[var(--color-text)] text-[#0a0a0c] text-[10px] font-extrabold tracking-[0.06em] rounded-[5px] text-center py-[5px] w-[50px]">
                {r.sport ?? "MLB"}
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

      {rows.length > 0 && (
        <div className="flex items-center justify-between px-[22px] py-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
          <span>
            Showing {from}-{to} of {paging.total}
          </span>
          <span className="flex gap-3 font-bold text-[var(--color-text-soft)]">
            {newerHref && <Link href={newerHref}>Newer</Link>}
            {olderHref && <Link href={olderHref}>Older</Link>}
          </span>
        </div>
      )}

      <div className="mt-auto border-t border-[var(--color-border)]">
        {buckets.map(([label, n]) => (
          <button
            key={label}
            type="button"
            className="flex w-full justify-between px-[22px] py-[11px] text-[12px] font-bold text-[var(--color-text-muted)] border-b border-[var(--color-border)] hover:text-[var(--color-text-soft)]"
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
