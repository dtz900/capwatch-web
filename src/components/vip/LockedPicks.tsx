"use client";

import { formatPostedAt, formatStake } from "@/lib/formatters";
import { formatBetDescriptor, formatMarketLabel } from "@/lib/markets";
import {
  isLockedPick,
  type VipCapperStatus,
  type VipLockedPick,
  type VipLockedSummary,
} from "@/lib/vip/types";
import { formatRevealTime } from "./format";

const CHIP =
  "text-[9px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)]";
const ROW =
  "flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors";

function LockGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function SummaryRow({ pick }: { pick: VipLockedSummary }) {
  return (
    <div className={ROW}>
      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
        <span className={CHIP}>{pick.sport}</span>
        <span className="text-[12px] font-semibold text-[var(--color-text-soft)]">
          Reveals at {formatRevealTime(pick.reveal_at)}
        </span>
      </div>
      <span
        aria-label="Locked"
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md
                   bg-[var(--color-gold-soft)] text-[var(--color-gold)]"
      >
        <LockGlyph />
      </span>
    </div>
  );
}

/* Subscriber/owner row. Mirrors PendingRow's layout: chips, pick line, meta. */
export function LockedPickRow({ pick }: { pick: VipLockedPick }) {
  const shape = {
    kind: pick.parlay_id != null ? ("parlay_leg" as const) : ("straight" as const),
    market: pick.market,
    selection: pick.selection,
    line: pick.line,
    odds_taken: pick.odds_taken,
  };
  const text = formatBetDescriptor(shape);
  const stake = pick.units != null && pick.units > 0 ? formatStake(pick.units) : null;
  const posted = formatPostedAt(pick.posted_at);

  return (
    <div className={ROW}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={CHIP}>{pick.sport}</span>
          <span className={CHIP}>
            {formatMarketLabel(shape)}
          </span>
        </div>
        <div className="text-[12px] font-semibold text-[var(--color-text)] truncate">{text}</div>
        <div className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
          {stake && <span>{stake}</span>}
          {posted && <span className="opacity-80">{posted}</span>}
        </div>
      </div>
    </div>
  );
}

export function LockedPicks({ status }: { status: VipCapperStatus }) {
  const locked = status.locked;
  if (locked.length === 0) return null;
  const canSee = status.viewer.subscribed || status.viewer.is_owner;

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          VIP · {locked.length} locked
        </span>
      </div>
      <div className="flex flex-col">
        {locked.map((p) =>
          canSee && isLockedPick(p) ? (
            <LockedPickRow key={p.id} pick={p} />
          ) : isLockedPick(p) ? (
            <SummaryRow
              key={p.id}
              pick={{ pick_id: p.id, sport: p.sport, reveal_at: p.reveal_at, posted_at: p.posted_at }}
            />
          ) : (
            <SummaryRow key={p.pick_id} pick={p} />
          ),
        )}
      </div>
    </section>
  );
}
