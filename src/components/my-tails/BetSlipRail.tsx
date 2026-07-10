"use client";
import { useBetSlip } from "@/components/my-tails/BetSlipContext";
import { slipProfit, type SlipEntry } from "@/lib/betslip";
import { StatusPill } from "@/components/my-tails/StatusPill";
import { VipTeaser } from "@/components/capper/VipTeaser";

function unitsStr(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}u`;
}

/** One slip entry. Shared by the desktop rail and the mobile drawer. */
export function SlipEntryRow({
  entry,
  onRemove,
  onUpdate,
}: {
  entry: SlipEntry;
  onRemove: (id: number) => void;
  onUpdate: (id: number, patch: { stake?: number; odds?: number }) => void;
}) {
  const graded = entry.outcome !== null;
  const profit = slipProfit(entry.outcome, entry.stake, entry.odds);
  return (
    <li className="py-2.5 border-b border-[var(--color-border)] last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight text-[var(--color-text)] truncate">
            {entry.selection}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] truncate">
            {entry.matchup ?? ""}
            {entry.capper_handle ? ` · @${entry.capper_handle}` : ""}
          </div>
        </div>
        {!graded && (
          <button
            aria-label={`Remove ${entry.selection} from bet slip`}
            title="Remove"
            onClick={() => onRemove(entry.id)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-neg)] text-xs shrink-0"
          >
            {"✕"}
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-3 tabular-nums">
        {graded ? (
          <>
            <span className="text-xs font-semibold text-[var(--color-text-soft)]">
              {entry.odds > 0 ? "+" : ""}
              {entry.odds} · {entry.stake.toFixed(1)}u
            </span>
            {profit !== null && (
              <span
                className={`text-xs font-bold ${
                  profit > 0
                    ? "text-[var(--color-pos)]"
                    : profit < 0
                      ? "text-[var(--color-neg)]"
                      : "text-[var(--color-text-muted)]"
                }`}
              >
                {unitsStr(profit)}
              </span>
            )}
          </>
        ) : (
          <>
            <label className="flex items-baseline gap-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              odds
              <input
                aria-label={`Odds for ${entry.selection}`}
                type="number"
                defaultValue={entry.odds}
                onBlur={(e) => onUpdate(entry.id, { odds: Number(e.target.value) })}
                className="w-14 bg-transparent border-b border-[var(--color-border-h)] text-xs font-semibold text-[var(--color-text)] text-right outline-none"
              />
            </label>
            <label className="flex items-baseline gap-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              stake
              <input
                aria-label={`Stake for ${entry.selection}`}
                type="number"
                step="0.1"
                defaultValue={entry.stake}
                onBlur={(e) => onUpdate(entry.id, { stake: Number(e.target.value) })}
                className="w-12 bg-transparent border-b border-[var(--color-border-h)] text-xs font-semibold text-[var(--color-text)] text-right outline-none"
              />
            </label>
          </>
        )}
        <span className="ml-auto">
          <StatusPill outcome={entry.outcome} />
        </span>
      </div>
    </li>
  );
}

export function BetSlipRail() {
  const slip = useBetSlip();
  if (!slip) return null;
  const { entries, totals, removeEntry, updateEntry, teaserOpen, closeTeaser } = slip;
  return (
    <aside className="w-full">
      {/* Sticky flat section-header strip: no rounded corners, opaque bg */}
      <div className="bg-[#0f0f14] border-y border-[var(--color-border)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        MY BET SLIP{totals.pending > 0 ? ` · ${totals.pending} pending` : ""}
      </div>
      {teaserOpen && (
        <div className="mt-3" onClick={closeTeaser}>
          <VipTeaser />
        </div>
      )}
      <div className="border border-t-0 border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 pb-4">
        {entries === null && (
          <p className="py-3 text-xs text-[var(--color-text-muted)]">Loading...</p>
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
    </aside>
  );
}
