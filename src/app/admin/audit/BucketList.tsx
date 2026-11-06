"use client";

import Link from "next/link";
import type { PickShapedFlag } from "./actions";
import { BulkCapperAck } from "./BulkCapperAck";
import { PickShapedQueue } from "./PickShapedQueue";
import { UNGRADED_FINAL_REASON_LABEL, type BucketRow, type UngradedFinalView } from "./labels";

export type BucketKind = "settled" | "pending" | "triaged" | "ungraded_final" | "pick_shaped";

export interface BucketData {
  settled: BucketRow[];
  pending: BucketRow[];
  ungradedFinal: UngradedFinalView[];
  flags: PickShapedFlag[];
  capper: string | null;
  showAcked: boolean;
  triagedHref: string;
  counts: { settled: number; pending: number; ungradedFinal: number };
}

interface Props {
  kind: BucketKind;
  data: BucketData;
  onBack: () => void;
}

const TITLE: Record<BucketKind, string> = {
  settled: "Settled, no action needed",
  pending: "Pending, will grade themselves",
  triaged: "Triaged, hidden",
  ungraded_final: "Ungraded on a final game",
  pick_shaped: "Pick-shaped rejects",
};

const MUTED = "text-[var(--color-text-muted)]";

function DenseList({ rows, total, showReason }: { rows: BucketRow[]; total: number; showReason: boolean }) {
  if (rows.length === 0) return <div className={`px-[22px] py-6 text-[12px] font-semibold ${MUTED}`}>Nothing here.</div>;
  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.pick_id}
          className="grid grid-cols-[54px_120px_1fr_auto] gap-3 px-[22px] py-[7px] border-b border-[var(--color-border)] text-[12px]"
        >
          <span className={`font-semibold tabular-nums ${MUTED}`}>{r.date ?? ""}</span>
          <span className="font-bold truncate text-[var(--color-text-soft)]">{r.capper}</span>
          <span className="font-bold truncate">{r.selection}</span>
          <span className={`font-semibold ${MUTED}`}>{showReason ? r.reason : `#${r.pick_id}`}</span>
        </div>
      ))}
      {total > rows.length && (
        <div className={`px-[22px] py-3 text-[11px] font-semibold ${MUTED}`}>
          Showing {rows.length} of {total.toLocaleString("en-US")}
        </div>
      )}
    </div>
  );
}

function UngradedFinalTable({ rows, total }: { rows: UngradedFinalView[]; total: number }) {
  if (rows.length === 0) return <div className={`px-[22px] py-6 text-[12px] font-semibold ${MUTED}`}>Nothing stuck.</div>;
  const th = "py-2 pr-3 font-bold";
  return (
    <div className="px-[22px] overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className={`text-left text-[10px] uppercase tracking-[0.12em] ${MUTED} border-b border-[var(--color-border)]`}>
            <th className={th}>Capper</th>
            <th className={th}>Selection</th>
            <th className={th}>Stat</th>
            <th className={th}>Sport</th>
            <th className={th}>Game</th>
            <th className={th}>Final since</th>
            <th className={th}>Reason</th>
            <th className={`${th} text-right`}>Pick</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pick_id} className="border-b border-[var(--color-border)]">
              <td className="py-2 pr-3 font-semibold">@{r.capper_handle ?? "unknown"}</td>
              <td className="py-2 pr-3 truncate max-w-[160px]">{r.selection ?? ""}</td>
              <td className={`py-2 pr-3 ${MUTED}`}>{r.stat_name ?? ""}</td>
              <td className={`py-2 pr-3 ${MUTED}`}>{r.sport}</td>
              <td className={`py-2 pr-3 tabular-nums ${MUTED}`}>{r.game_id ?? ""}</td>
              <td className={`py-2 pr-3 tabular-nums ${MUTED}`}>{r.finalSince}</td>
              <td className={`py-2 pr-3 ${MUTED}`}>{UNGRADED_FINAL_REASON_LABEL[r.reason] ?? r.reason}</td>
              <td className={`py-2 text-right tabular-nums ${MUTED}`}>#{r.pick_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > rows.length && (
        <div className={`py-3 text-[11px] font-semibold ${MUTED}`}>
          Showing {rows.length} of {total.toLocaleString("en-US")}
        </div>
      )}
    </div>
  );
}

export function BucketList({ kind, data, onBack }: Props) {
  return (
    <div>
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          onBack();
        }}
        className="w-full text-left px-[22px] py-[11px] border-b border-[var(--color-border)] text-[12px] font-bold text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
      >
        ‹ Back to queue
      </button>
      <div className="px-[22px] pt-3 pb-2 text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[var(--color-text-muted)]">
        {TITLE[kind]}
      </div>
      {kind === "settled" && (
        <>
          {data.capper && (
            <div className="px-[22px] pb-3">
              <BulkCapperAck capper={data.capper} />
            </div>
          )}
          <DenseList rows={data.settled} total={data.counts.settled} showReason />
        </>
      )}
      {kind === "pending" && <DenseList rows={data.pending} total={data.counts.pending} showReason={false} />}
      {kind === "triaged" && (
        <div className={`px-[22px] pb-4 text-[12px] font-semibold leading-[18px] ${MUTED}`}>
          Rows you skipped are hidden from the queue. Grades are unchanged.
          <div className="mt-3">
            {data.showAcked ? (
              <span className="text-[var(--color-text-soft)]">
                The queue is showing triaged rows now. Unskip puts one back.
              </span>
            ) : (
              <Link href={data.triagedHref} className="font-bold text-[var(--color-text-soft)] hover:text-[var(--color-text)]">
                Show triaged rows in the queue
              </Link>
            )}
          </div>
        </div>
      )}
      {kind === "ungraded_final" && <UngradedFinalTable rows={data.ungradedFinal} total={data.counts.ungradedFinal} />}
      {kind === "pick_shaped" && (
        <div className="px-[22px] pb-4">
          <PickShapedQueue flags={data.flags} />
        </div>
      )}
    </div>
  );
}
