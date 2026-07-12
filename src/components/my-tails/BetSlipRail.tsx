"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useBetSlip } from "@/components/my-tails/BetSlipContext";
import { netOdds, slipProfit, type SlipEntry } from "@/lib/betslip";
import { StatusPill } from "@/components/my-tails/StatusPill";
import { VipTeaser } from "@/components/capper/VipTeaser";

/* The slip is a branded TailSlips ticket: deep teal gradient pulled from the
   logo mark, deliberately richer than the site's flat dark chrome, per
   David's direction for this surface (no form-looking inputs). Green/red
   stay reserved for graded P&L; the accent is the logo's teal end so it
   never reads as a result. */
const SLIP_TEAL = "#2fd9c0";

function unitsStr(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}u`;
}

function oddsStr(o: number): string {
  return `${o > 0 ? "+" : ""}${o}`;
}

/** One slip entry, styled as a ticket leg. Shared by the desktop rail and
    the mobile drawer. Odds and stake render as bold ticket numbers that
    happen to be editable: borderless inputs, teal underline only on focus,
    committed on blur. The stake is a small inline "1u" under the odds, no
    labeled columns. Graded legs lock to a static result. */
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
  // Local input state so commits happen on blur; the provider is the
  // source of truth.
  const [wager, setWager] = useState(String(entry.stake));
  const [odds, setOdds] = useState(String(entry.odds));

  return (
    <li className="rounded-lg bg-[rgba(8,12,11,0.75)] ring-1 ring-[rgba(47,217,192,0.10)] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight text-white truncate">
            {entry.selection}
          </div>
          <div className="mt-0.5 text-[11px] text-[#6da399] truncate">
            {entry.matchup ?? ""}
            {entry.capper_handle ? ` · @${entry.capper_handle}` : ""}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-2">
            {graded ? (
              <span className="text-[16px] font-extrabold tabular-nums" style={{ color: SLIP_TEAL }}>
                {oddsStr(entry.odds)}
              </span>
            ) : (
              <input
                aria-label={`Odds for ${entry.selection}`}
                type="number"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                onBlur={() => onUpdate(entry.id, { odds: Number(odds) })}
                style={{ color: SLIP_TEAL }}
                className="w-16 bg-transparent text-right text-[16px] font-extrabold tabular-nums outline-none border-b border-transparent focus:border-[rgba(47,217,192,0.6)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            )}
            {!graded && (
              <button
                aria-label={`Remove ${entry.selection} from bet slip`}
                title="Remove"
                onClick={() => onRemove(entry.id)}
                className="text-[#4c7d72] hover:text-white text-xs"
              >
                {"✕"}
              </button>
            )}
          </div>
          {!graded && (
            <span className="mt-0.5 flex items-baseline gap-0.5">
              <input
                aria-label={`Wager for ${entry.selection}`}
                type="number"
                step="0.1"
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                onBlur={() => onUpdate(entry.id, { stake: Number(wager) })}
                className="w-9 bg-transparent text-right text-[12px] font-bold tabular-nums text-[#cfe8e0] outline-none border-b border-transparent focus:border-[rgba(47,217,192,0.6)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[11px] font-bold text-[#4c7d72]">u</span>
            </span>
          )}
        </div>
      </div>

      {graded && (
        <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[rgba(47,217,192,0.18)] pt-2.5">
          <span className="text-[11px] tabular-nums text-[#6da399]">
            {entry.stake.toFixed(1)}u to win {(entry.stake * netOdds(entry.odds)).toFixed(2)}u
          </span>
          <div className="flex items-center gap-2">
            {profit !== null && (
              <span
                className={`text-sm font-extrabold tabular-nums ${
                  profit > 0
                    ? "text-[var(--color-pos)]"
                    : profit < 0
                      ? "text-[var(--color-neg)]"
                      : "text-[#6da399]"
                }`}
              >
                {unitsStr(profit)}
              </span>
            )}
            <StatusPill outcome={entry.outcome} />
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

const COLLAPSE_KEY = "ts-betslip-collapsed";

export function BetSlipRail() {
  const slip = useBetSlip();
  // Default expanded; the stored preference is applied after mount so the
  // server and client render the same initial markup.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {
      /* storage unavailable: stay expanded */
    }
  }, []);
  if (!slip) return null;
  const { entries, totals, removeEntry, updateEntry, teaserOpen, closeTeaser } = slip;
  const pending = pendingTotals(entries ?? []);
  const count = entries?.length ?? 0;

  const toggle = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      } catch {
        /* preference just won't persist */
      }
      return !v;
    });
  };

  if (collapsed) {
    // Collapsed = a ticket stub sitting in the page flow next to the title.
    // It scrolls away with the page; only the opened slip pins itself.
    return (
      <button
        onClick={toggle}
        aria-label={`Open bet slip, ${totals.pending} pending`}
        className="relative flex shrink-0 items-stretch overflow-hidden rounded-lg bg-gradient-to-r from-[#12443a] via-[#0e3a31] to-[#0c2f28] ring-1 ring-[rgba(47,217,192,0.35)] shadow-[0_8px_32px_rgba(10,60,50,0.5)] transition-all hover:ring-[rgba(47,217,192,0.6)]"
      >
        <span className="flex items-center gap-2 py-2.5 pl-3.5 pr-3.5">
          <Image
            src="/logo-crown.png"
            alt=""
            width={1135}
            height={793}
            className="h-[18px] w-auto"
          />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#f7f3e9]">
            Bet Slip
          </span>
        </span>
        {/* Perforation: dashed tear line with notch bites top and bottom */}
        <span className="relative border-l border-dashed border-[rgba(47,217,192,0.35)]" aria-hidden="true">
          <span className="absolute -left-[5px] -top-[5px] h-2.5 w-2.5 rounded-full bg-[var(--color-bg)]" />
          <span className="absolute -left-[5px] -bottom-[5px] h-2.5 w-2.5 rounded-full bg-[var(--color-bg)]" />
        </span>
        <span
          className="flex min-w-10 items-center justify-center px-2.5 text-[13px] font-extrabold tabular-nums"
          style={{ color: count > 0 ? SLIP_TEAL : "#4c7d72" }}
        >
          {count}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed right-3 sm:right-4 top-24 z-30 w-[304px] max-w-[calc(100vw-1.5rem)]">
    <aside className="w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#0c1f1b] via-[#0a1512] to-[#07100d] ring-1 ring-[rgba(47,217,192,0.22)] shadow-[0_12px_48px_rgba(0,0,0,0.5)]">
      {/* Ticket header: teal bar, the TailSlips logo, count badge, collapse */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#0e2c25] to-[#0a1e19] px-4 py-3 border-b border-[rgba(47,217,192,0.25)]">
        <span className="flex items-center">
          <Image
            src="/logo-horizontal-aligned-tight.png"
            alt="TailSlips"
            width={1704}
            height={402}
            className="h-5 w-auto"
          />
          <span className="sr-only">My Bet Slip</span>
        </span>
        <span className="flex items-center gap-2">
          {count > 0 && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold tabular-nums text-[#06231d]"
              style={{ backgroundColor: SLIP_TEAL }}
            >
              {count}
            </span>
          )}
          <button
            onClick={toggle}
            aria-label="Collapse bet slip"
            title="Collapse"
            className="text-[#6da399] hover:text-white text-sm leading-none"
          >
            {"»"}
          </button>
        </span>
      </div>
      {teaserOpen && (
        <div className="p-3" onClick={closeTeaser}>
          <VipTeaser />
        </div>
      )}
      {/* Picks scroll; the P&L footer below is pinned to the slip, so the
          list fades out behind it via the mask. */}
      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-20px),transparent)]">
        {entries === null && (
          <p className="py-3 text-xs text-[#6da399]">Loading...</p>
        )}
        {entries !== null && entries.length === 0 && (
          <p className="py-8 text-center text-xs leading-relaxed text-[#6da399]">
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
              <div className="mt-3 space-y-1.5 border-t border-dashed border-[rgba(47,217,192,0.22)] pt-3 text-[12px] tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-[#6da399]">Total wager</span>
                  <span className="font-extrabold text-white">
                    {pending.wager.toFixed(1)}u
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6da399]">To win</span>
                  <span className="font-extrabold" style={{ color: SLIP_TEAL }}>
                    {pending.toWin.toFixed(2)}u
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {entries !== null && entries.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex items-end justify-between rounded-lg bg-[rgba(4,16,13,0.6)] px-3 py-2.5">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#4c7d72]">
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
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#4c7d72]">
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
        </div>
      )}
    </aside>
    </div>
  );
}
