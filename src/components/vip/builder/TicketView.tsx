"use client";

import { useEffect, useState } from "react";
import { VipCrown } from "@/components/vip/VipCrown";
import { ERROR_TEXT, PRIMARY_BTN, SECONDARY_BTN, VIP_WORDMARK } from "@/components/vip/styles";
import type { VipClamp } from "@/lib/vip/types";
import { teamName } from "./adapt";
import { OTHER_BOOK, bookName } from "./books";
import { fmtPrice, toDecimal, type Fmt } from "./odds";
import { legWhen } from "./SlipCard";
import { legPrice, unlockAt, type SlipLeg } from "./slip";
import { GlassCard, LegLogo } from "./ui";

export interface Ticket {
  legs: SlipLeg[];
  units: string;
  combined: number | null;
  book: string;
}

export interface Posted extends Ticket {
  ticketId: number;
  /** The pick as first posted, kept once it has been fixed. */
  original: Ticket | null;
  pulled: boolean;
  /** Epoch ms when the 10 minute fix window closes. Set at the first post;
   *  a fix keeps it, so fixing never extends the window. */
  fixDeadline: number;
  clamped: VipClamp[];
}

const clampNote = (c: VipClamp | undefined, fmt: Fmt) =>
  c ? `Better than every book we track. Your record counts it at ${fmtPrice(c.recorded, fmt)}.` : null;

export function TicketView({
  ticket,
  fmt,
  struck = false,
  clamped = [],
}: {
  ticket: Ticket;
  fmt: Fmt;
  struck?: boolean;
  clamped?: VipClamp[];
}) {
  const { legs, units, combined, book } = ticket;
  const parlay = legs.length > 1;
  const toWin = combined !== null ? Number(units) * (toDecimal(combined) - 1) : null;
  // A straight's clamp has no leg index; on a parlay that means the ticket.
  const legClamp = (i: number) => clamped.find((c) => (parlay ? c.leg_index === i : c.leg_index === null));
  const ticketClamp = parlay ? clamped.find((c) => c.leg_index === null) : undefined;
  return (
    <div className={`flex flex-col ${struck ? "opacity-50" : ""}`}>
      {legs.map((l, i) => (
        <div key={l.side.key} className="flex flex-col gap-1.5 py-3 border-t border-[rgba(255,255,255,0.08)] first:border-t-0">
          <div className="flex items-center gap-3">
            <LegLogo leg={l} />
            <div className="flex-1 min-w-0">
              <div className={`text-[14px] font-bold leading-tight text-[var(--color-text)] ${struck ? "line-through" : ""}`}>
                {l.side.label}
              </div>
              <div className="mt-0.5 text-[11px] text-[rgba(247,243,233,0.55)]">
                {/* Team codes on phones so a leg stays two lines, names above sm. */}
                <span className="sm:hidden">{l.game.away} @ {l.game.home}</span>
                <span className="hidden sm:inline">
                  {teamName(l.game.sport, l.game.away)} @ {teamName(l.game.sport, l.game.home)}
                </span>
                {" · "}{legWhen(l)}
              </div>
            </div>
            <span className="text-[14px] font-extrabold tabular-nums text-[var(--color-text)]">
              {(() => {
                const p = legPrice(l);
                return p !== null ? fmtPrice(p, fmt) : l.price;
              })()}
            </span>
          </div>
          {clampNote(legClamp(i), fmt) && (
            <span className="pl-12 text-[11px] text-[rgba(247,243,233,0.7)]">{clampNote(legClamp(i), fmt)}</span>
          )}
        </div>
      ))}
      <div className="mt-1 pt-3 border-t border-[rgba(255,255,255,0.12)] flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(247,243,233,0.55)]">
            {parlay ? `${legs.length}-leg parlay` : "Straight"}
          </span>
          <span className="text-[13px] font-semibold tabular-nums text-[rgba(247,243,233,0.8)]">
            {units}u{book !== OTHER_BOOK ? ` at ${bookName(book)}` : ""}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className={`text-[28px] leading-none font-extrabold tabular-nums tracking-[-0.02em] text-[var(--color-text)] ${struck ? "line-through" : ""}`}>
            {combined !== null ? fmtPrice(combined, fmt) : "--"}
          </span>
          <span className="text-[12px] font-semibold tabular-nums text-[rgba(247,243,233,0.7)]">
            To win {toWin !== null ? `${toWin.toFixed(2)}u` : "--"}
          </span>
        </div>
      </div>
      {ticketClamp && <p className="pt-2 text-[11px] text-[rgba(247,243,233,0.7)]">{clampNote(ticketClamp, fmt)}</p>}
    </div>
  );
}

export function summary(t: Ticket, fmt: Fmt): string {
  const picks = t.legs.map((l) => `${l.side.label} ${t.legs.length === 1 ? l.price : ""}`.trim()).join(" + ");
  const odds = t.legs.length > 1 && t.combined !== null ? ` · ${fmtPrice(t.combined, fmt)}` : "";
  return `${picks}${odds} · ${t.units}u`;
}

/** "9:07" from milliseconds left, floored at 0:00. */
function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Ticks once a second while `on`, so a countdown re-renders. */
function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [on]);
  return now;
}

export function PostedView({
  posted,
  fmt,
  onFix,
  onPull,
  onAnother,
  error,
  busy,
}: {
  posted: Posted;
  fmt: Fmt;
  onFix: () => void;
  onPull: () => void;
  onAnother: () => void;
  error: string | null;
  busy: boolean;
}) {
  const [confirmPull, setConfirmPull] = useState(false);
  const now = useNow(!posted.pulled);
  const fixLeft = posted.fixDeadline - now;
  return (
    <div className="mx-auto w-full max-w-[580px] flex flex-col gap-4 py-2">
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${
            posted.pulled
              ? "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)]"
              : "bg-[linear-gradient(160deg,#6d28d9_0%,#4c1d95_100%)] text-[var(--color-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          }`}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="w-5 h-5">
            {posted.pulled ? (
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[18px] font-extrabold tracking-[-0.01em] text-[var(--color-text)]">
            {posted.pulled ? "Pick pulled" : posted.original ? "Fix sent to your subscribers" : "Sent to your subscribers"}
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            {posted.pulled
              ? "Subscribers were alerted. It stays on your record as Pulled and counts as no action."
              : `Unlocks to everyone at ${unlockAt(posted.legs)}.`}
          </span>
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 pb-1">
          <VipCrown className="w-4 h-4" />
          <span className={VIP_WORDMARK}>{posted.pulled ? "PULLED" : posted.original ? "FIXED" : "LIVE FOR SUBSCRIBERS"}</span>
        </div>
        <TicketView ticket={posted} fmt={fmt} struck={posted.pulled} clamped={posted.clamped} />
        {posted.original && (
          <div className="mt-3 rounded-lg bg-[rgba(0,0,0,0.25)] px-3 py-2 text-[12px] text-[rgba(247,243,233,0.55)]">
            Original: <span className="line-through">{summary(posted.original, fmt)}</span>
          </div>
        )}
      </GlassCard>

      {!posted.pulled && confirmPull && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] px-4 py-4 flex flex-col gap-3">
          <span className="text-[14px] font-bold text-[var(--color-text)]">Pull this pick?</span>
          <span className="text-[12px] text-[var(--color-text-soft)]">
            Subscribers get an alert. It stays on your record as Pulled and counts as no action. This can&apos;t be undone.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className={PRIMARY_BTN}
              disabled={busy}
              onClick={() => {
                onPull();
                setConfirmPull(false);
              }}
            >
              Pull pick
            </button>
            <button type="button" className={SECONDARY_BTN} onClick={() => setConfirmPull(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}

      {/* Phones: Fix and Pull share a row, Post another spans below.
          sm and up: one row, Post another pushed right. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        {!posted.pulled && !confirmPull && (
          <>
            <button type="button" className={SECONDARY_BTN} disabled={fixLeft <= 0 || busy} onClick={onFix}>
              {fixLeft > 0 ? (
                <>
                  Fix · <span className="tabular-nums">{mmss(fixLeft)}</span>
                </>
              ) : (
                "Fix closed"
              )}
            </button>
            <button type="button" className={SECONDARY_BTN} disabled={busy} onClick={() => setConfirmPull(true)}>
              Pull
            </button>
          </>
        )}
        <button type="button" className={`${PRIMARY_BTN} col-span-2 h-11 sm:h-10 sm:ml-auto`} onClick={onAnother}>
          Post another
        </button>
      </div>
      {error && (
        <span role="status" className={ERROR_TEXT}>
          {error}
        </span>
      )}
      {!posted.pulled && (
        <p className="text-[11px] text-[var(--color-text-muted)]">
          {fixLeft > 0
            ? "Fix within 10 minutes of posting. Pull anytime before the first game starts."
            : "The fix window has closed. You can still pull before the first game starts."}
        </p>
      )}
    </div>
  );
}
