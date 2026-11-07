import type { RawSibling } from "@/lib/api";
import { formatOdds } from "./reviewLabels";
import type { ReviewRow } from "./reviewRow";

interface Props {
  current: ReviewRow;
  /** Held picks from this tweet, the current row included. */
  held: ReviewRow[];
  tracked: RawSibling[];
  groupSelected: boolean;
  pending: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onSelectGroup: (on: boolean) => void;
}

const BTN = "border rounded-md px-2.5 py-[3px] text-[11.5px] font-extrabold disabled:opacity-40";
const OK = `${BTN} border-[var(--color-border)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]`;
const NO = `${BTN} text-[var(--color-neg)] border-[rgba(239,68,68,0.45)]`;
const ROW = "grid grid-cols-[1fr_auto_auto] gap-3 items-center py-2 border-b border-[var(--color-border)]";

const trackedLabel = (s: string) => (s === "auto_approved" ? "Tracked" : s === "rejected" ? "Rejected" : s);

function Pick({ selection, odds }: { selection: string | null; odds: number | null }) {
  return (
    <span className="min-w-0 truncate text-[13.5px] font-bold">
      {selection ?? "Untitled pick"}
      {odds != null && <span className="ml-2 text-[var(--color-text-soft)] tabular-nums">{formatOdds(odds)}</span>}
    </span>
  );
}

export function FromThisTweet({
  current,
  held,
  tracked,
  groupSelected,
  pending,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
  onSelectGroup,
}: Props) {
  if (held.length === 1 && tracked.length === 0) return null;
  const ordered = [current, ...held.filter((r) => r.pick_id !== current.pick_id)];
  const many = held.length > 1;
  return (
    <section className="mt-5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="mr-auto text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[var(--color-text-muted)]">
          From this tweet
        </div>
        {many && (
          <>
            <button type="button" className={OK} onClick={() => onSelectGroup(!groupSelected)}>
              {groupSelected ? `Unselect all ${held.length}` : `Select all ${held.length}`}
            </button>
            <button type="button" className={OK} disabled={pending} onClick={onApproveAll}>
              {`Approve all ${held.length} held`}
            </button>
            <button type="button" className={NO} disabled={pending} onClick={onRejectAll}>
              {`Reject all ${held.length} held`}
            </button>
          </>
        )}
      </div>
      <div className="mt-2 border-t border-[var(--color-border)]">
        {ordered.map((r) => {
          const isCurrent = r.pick_id === current.pick_id;
          return (
            <div key={r.pick_id} className={ROW}>
              <Pick selection={r.selection} odds={r.odds_taken} />
              <span className="text-[11.5px] font-extrabold text-[var(--color-text-muted)]">Held</span>
              {isCurrent ? (
                <span className="text-[11.5px] font-semibold text-[var(--color-text-muted)]">this one</span>
              ) : (
                <span className="flex gap-1.5">
                  <button type="button" className={OK} disabled={pending} onClick={() => onApprove(r.pick_id)}>
                    Approve
                  </button>
                  <button type="button" className={NO} disabled={pending} onClick={() => onReject(r.pick_id)}>
                    Reject
                  </button>
                </span>
              )}
            </div>
          );
        })}
        {tracked.map((t) => (
          <div key={t.id} className={`${ROW} opacity-50`}>
            <Pick selection={t.selection} odds={t.odds_taken} />
            <span className="text-[11.5px] font-extrabold text-[var(--color-text-muted)]">
              {trackedLabel(t.review_status)}
            </span>
            <span />
          </div>
        ))}
      </div>
    </section>
  );
}
