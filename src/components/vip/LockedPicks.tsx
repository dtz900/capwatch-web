"use client";

import { useState } from "react";
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

/* ---------- ticket grouping ---------- */

export type LockedTicket =
  | { kind: "straight"; key: string; pick: VipLockedPick }
  | { kind: "parlay"; key: string; legs: VipLockedPick[] };

/** Collapse locked rows into tickets: straights stand alone, parlay legs
 *  (shared parlay_id) become one ticket ordered by parlay_leg_index. Ticket
 *  order follows the first row seen. */
export function groupLockedTickets(picks: VipLockedPick[]): LockedTicket[] {
  const order: Array<{ kind: "straight"; pick: VipLockedPick } | { kind: "parlay"; id: number }> = [];
  const parlays = new Map<number, VipLockedPick[]>();
  for (const p of picks) {
    if (p.parlay_id == null) {
      order.push({ kind: "straight", pick: p });
      continue;
    }
    const legs = parlays.get(p.parlay_id);
    if (legs) {
      parlays.set(p.parlay_id, [...legs, p]);
    } else {
      parlays.set(p.parlay_id, [p]);
      order.push({ kind: "parlay", id: p.parlay_id });
    }
  }
  return order.map((o) =>
    o.kind === "straight"
      ? { kind: "straight", key: `s${o.pick.id}`, pick: o.pick }
      : {
          kind: "parlay",
          key: `p${o.id}`,
          legs: [...(parlays.get(o.id) ?? [])].sort(
            (a, b) => (a.parlay_leg_index ?? 0) - (b.parlay_leg_index ?? 0),
          ),
        },
  );
}

export interface SummaryTicket {
  key: string;
  sport: string;
  reveal_at: string;
  posted_at: string;
  legs: number;
}

/** Anonymous viewers get the platform's locked_summary (pick_id, sport,
 *  reveal_at, posted_at) with no parlay_id. A parlay's legs are inserted in
 *  one call, so they share reveal_at and a posted_at within the same second;
 *  rows matching on (sport, reveal_at, posted_at to the second) count as one
 *  ticket. Two straights would only merge if posted in the same second with
 *  the same reveal time, which one-pick-per-submit posting rules out in
 *  practice. */
export function groupSummaryTickets(rows: VipLockedSummary[]): SummaryTicket[] {
  const order: string[] = [];
  const byKey = new Map<string, SummaryTicket>();
  for (const r of rows) {
    const sec = Math.floor(new Date(r.posted_at).getTime() / 1000);
    const k = `${r.sport}|${new Date(r.reveal_at).getTime()}|${sec}`;
    const hit = byKey.get(k);
    if (hit) {
      byKey.set(k, { ...hit, legs: hit.legs + 1 });
      continue;
    }
    order.push(k);
    byKey.set(k, {
      key: `a${r.pick_id}`,
      sport: r.sport,
      reveal_at: r.reveal_at,
      posted_at: r.posted_at,
      legs: 1,
    });
  }
  return order.map((k) => byKey.get(k)!);
}

function toSummary(p: VipLockedSummary | VipLockedPick): VipLockedSummary {
  return isLockedPick(p)
    ? { pick_id: p.id, sport: p.sport, reveal_at: p.reveal_at, posted_at: p.posted_at }
    : p;
}

/* ---------- rows ---------- */

function SummaryRow({ ticket }: { ticket: SummaryTicket }) {
  return (
    <div className={ROW}>
      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
        <span className={CHIP}>{ticket.sport}</span>
        <span className="text-[12px] font-semibold text-[var(--color-text-soft)]">
          Reveals at {formatRevealTime(ticket.reveal_at)}
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

function stakeOf(units: number | null): string | null {
  return units != null && units > 0 ? formatStake(units) : null;
}

/* Subscriber/owner straight row. Mirrors PendingRow's layout: chips, pick line, meta. */
export function LockedPickRow({ pick }: { pick: VipLockedPick }) {
  const shape = {
    kind: "straight" as const,
    market: pick.market,
    selection: pick.selection,
    line: pick.line,
    odds_taken: pick.odds_taken,
  };
  const text = formatBetDescriptor(shape);
  const stake = stakeOf(pick.units);
  const posted = formatPostedAt(pick.posted_at);

  return (
    <div className={ROW}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={CHIP}>{pick.sport}</span>
          <span className={CHIP}>{formatMarketLabel(shape)}</span>
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

function signedOdds(o: number): string {
  return o > 0 ? `+${o}` : String(o);
}

/* One parlay ticket, expander pattern from PendingBlock (open by default).
 * The platform stores combined_odds and units on leg 0 only
 * (core/manual_bet.py); when leg 0 carries odds and no other leg does, that
 * is the ticket price and the legs render without odds. */
export function LockedParlayRow({ legs }: { legs: VipLockedPick[] }) {
  const [expanded, setExpanded] = useState(true);
  const lead = legs.find((l) => l.parlay_leg_index === 0) ?? legs[0];
  const combined =
    lead.odds_taken != null && legs.every((l) => l === lead || l.odds_taken == null);
  const title = formatBetDescriptor({ kind: "parlay", leg_count: legs.length });
  const priced = combined && lead.odds_taken != null ? `${title} ${signedOdds(lead.odds_taken)}` : title;
  const stake = stakeOf(lead.units);
  const posted = formatPostedAt(lead.posted_at);
  const toggle = () => setExpanded((v) => !v);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={`${ROW} cursor-pointer`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={CHIP}>{lead.sport}</span>
            <span className={CHIP}>Parlay</span>
          </div>
          <div className="text-[12px] font-semibold text-[var(--color-text)] truncate">
            {stake ? `${priced} · ${stake}` : priced}
          </div>
          {posted && (
            <div className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5 opacity-80">
              {posted}
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <ul className="pl-4 pb-2 pt-0.5 text-[12px] text-[var(--color-text-soft)] flex flex-col gap-1">
          {legs.map((l) => (
            <li key={l.id} className="truncate">
              {formatBetDescriptor({
                kind: "parlay_leg",
                market: l.market,
                selection: l.selection,
                line: l.line,
                odds_taken: combined ? null : l.odds_taken,
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Ticket rows for picks the viewer may see in full. */
export function LockedTicketList({ tickets }: { tickets: LockedTicket[] }) {
  return (
    <div className="flex flex-col">
      {tickets.map((t) =>
        t.kind === "parlay" ? (
          <LockedParlayRow key={t.key} legs={t.legs} />
        ) : (
          <LockedPickRow key={t.key} pick={t.pick} />
        ),
      )}
    </div>
  );
}

export function LockedHeader({ count, className = "mb-3" }: { count: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
      <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
        VIP · {count} locked
      </span>
    </div>
  );
}

export function LockedPicks({ status }: { status: VipCapperStatus }) {
  const locked: Array<VipLockedSummary | VipLockedPick> = status.locked;
  if (locked.length === 0) return null;
  const canSee = status.viewer.subscribed || status.viewer.is_owner;
  const full = canSee ? locked.filter(isLockedPick) : [];
  const showFull = canSee && full.length === locked.length;

  const tickets = showFull ? groupLockedTickets(full) : [];
  const summary = showFull ? [] : groupSummaryTickets(locked.map(toSummary));

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4">
      <LockedHeader count={showFull ? tickets.length : summary.length} />
      {showFull ? (
        <LockedTicketList tickets={tickets} />
      ) : (
        <div className="flex flex-col">
          {summary.map((t) => (
            <SummaryRow key={t.key} ticket={t} />
          ))}
        </div>
      )}
    </section>
  );
}
