"use client";
import { useState } from "react";
import { useBetSlip } from "@/components/my-tails/BetSlipContext";
import { netOdds, slipProfit, type SlipEntry } from "@/lib/betslip";
import { StatusPill } from "@/components/my-tails/StatusPill";
import { VipTeaser } from "@/components/capper/VipTeaser";

function unitsStr(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}u`;
}

function oddsStr(o: number): string {
  return `${o > 0 ? "+" : ""}${o}`;
}

/** One slip entry, styled like a sportsbook bet card. Shared by the desktop
    rail and the mobile drawer. Ungraded rows carry live Wager / To Win
    boxes and an editable odds field (David's real book fill differs from the
    posted price); graded rows lock to a static result. */
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
  // Local input state so To Win updates live while typing; the provider is
  // the source of truth and commits on blur.
  const [wager, setWager] = useState(String(entry.stake));
  const [odds, setOdds] = useState(String(entry.odds));
  const liveStake = Number(wager);
  const liveOdds = Number(odds);
  const toWin =
    Number.isFinite(liveStake) && Number.isFinite(liveOdds) && liveOdds !== 0
      ? liveStake * netOdds(liveOdds)
      : null;

  return (
    <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[15px] font-bold leading-tight text-[var(--color-text)] truncate">
            {entry.selection}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)] truncate">
            {entry.matchup ?? ""}
            {entry.capper_handle ? ` · @${entry.capper_handle}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {graded ? (
            <span className="text-[15px] font-bold tabular-nums text-[var(--color-text)]">
              {oddsStr(entry.odds)}
            </span>
          ) : (
            <input
              aria-label={`Odds for ${entry.selection}`}
              type="number"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              onBlur={() => onUpdate(entry.id, { odds: Number(odds) })}
              className="w-16 bg-transparent text-right text-[15px] font-bold tabular-nums text-[var(--color-text)] outline-none focus:border-b focus:border-[var(--color-border-h)]"
            />
          )}
          {!graded && (
            <button
              aria-label={`Remove ${entry.selection} from bet slip`}
              title="Remove"
              onClick={() => onRemove(entry.id)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-neg)] text-xs"
            >
              {"✕"}
            </button>
          )}
        </div>
      </div>

      {graded ? (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
            {entry.stake.toFixed(1)}u to win {(entry.stake * netOdds(entry.odds)).toFixed(1)}u
          </span>
          <div className="flex items-center gap-2">
            {profit !== null && (
              <span
                className={`text-sm font-bold tabular-nums ${
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
            <StatusPill outcome={entry.outcome} />
          </div>
        </div>
      ) : (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Wager
            </span>
            <div className="flex items-center gap-1 rounded-md border border-[var(--color-border-h)] bg-black/20 px-2 py-1.5">
              <input
                aria-label={`Wager for ${entry.selection}`}
                type="number"
                step="0.1"
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                onBlur={() => onUpdate(entry.id, { stake: Number(wager) })}
                className="w-full min-w-0 bg-transparent text-sm font-semibold tabular-nums text-[var(--color-text)] outline-none"
              />
              <span className="text-xs text-[var(--color-text-muted)]">u</span>
            </div>
          </label>
          <div className="block">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              To win
            </span>
            <div className="flex items-center rounded-md border border-[var(--color-border)] px-2 py-1.5">
              <span className="text-sm font-semibold tabular-nums text-[var(--color-text-soft)]">
                {toWin !== null ? `${toWin.toFixed(2)}u` : "-"}
              </span>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

/** Sum stake and potential payout across the still-pending entries. */
function pendingTotals(entries: SlipEntry[]): { wager: number; toWin: number } {
  let wager = 0;
  let toWin = 0;
  for (const e of entries) {
    if (e.outcome !== null) continue;
    wager += e.stake;
    toWin += e.stake * netOdds(e.odds);
  }
  return { wager, toWin };
}

export function BetSlipRail() {
  const slip = useBetSlip();
  if (!slip) return null;
  const { entries, totals, removeEntry, updateEntry, teaserOpen, closeTeaser } = slip;
  const pending = pendingTotals(entries ?? []);
  return (
    <aside className="w-full">
      {/* Flat section-header strip: no rounded corners, opaque bg */}
      <div className="rounded-t-xl bg-[#0f0f14] border border-[var(--color-border)] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">
        My Bet Slip
        {(entries?.length ?? 0) > 0 ? (
          <span className="ml-2 text-[var(--color-text-muted)]">
            {entries?.length}
          </span>
        ) : null}
      </div>
      {teaserOpen && (
        <div className="mt-3" onClick={closeTeaser}>
          <VipTeaser />
        </div>
      )}
      <div className="rounded-b-xl border border-t-0 border-[var(--color-border)] bg-[var(--color-bg)] p-3">
        {entries === null && (
          <p className="py-3 text-xs text-[var(--color-text-muted)]">Loading...</p>
        )}
        {entries !== null && entries.length === 0 && (
          <p className="py-6 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
            Tap a pick on any card to log it here.
            <br />
            It grades itself.
          </p>
        )}
        {entries !== null && entries.length > 0 && (
          <>
            <ul className="space-y-2">
              {entries.map((e) => (
                <SlipEntryRow key={e.id} entry={e} onRemove={removeEntry} onUpdate={updateEntry} />
              ))}
            </ul>
            {pending.wager > 0 && (
              <div className="mt-3 space-y-1 border-t border-[var(--color-border)] pt-3 text-xs tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">Total wager</span>
                  <span className="font-semibold text-[var(--color-text)]">
                    {pending.wager.toFixed(1)}u
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">To win</span>
                  <span className="font-semibold text-[var(--color-text-soft)]">
                    {pending.toWin.toFixed(1)}u
                  </span>
                </div>
              </div>
            )}
            <div className="mt-3 flex items-end justify-between border-t border-[var(--color-border)] pt-3">
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
