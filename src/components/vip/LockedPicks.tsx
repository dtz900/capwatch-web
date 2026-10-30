"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { formatStake } from "@/lib/formatters";
import { formatBetDescriptor } from "@/lib/markets";
import {
  isLockedPick,
  type VipCapperStatus,
  type VipLockedPick,
  type VipLockedSummary,
  type VipOriginal,
} from "@/lib/vip/types";
import { LeagueMark } from "./EligibilityBadges";
import { vipSelection } from "@/lib/vip/describe";
import { VipCrown } from "./VipCrown";
import { formatRevealPhrase, formatRevealTime } from "./format";
import { EYEBROW } from "./styles";

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
  const order: Array<
    { kind: "straight"; pick: VipLockedPick } | { kind: "parlay"; id: number }
  > = [];
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
    ? {
        pick_id: p.id,
        sport: p.sport,
        reveal_at: p.reveal_at,
        posted_at: p.posted_at,
      }
    : p;
}

/* ---------- rows ---------- */

/** Wall clock sampled once on mount and every 30 s, so a row flips to
 *  Started without a reload. Reading Date.now() in render is impure. */
function useNow(stepMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => window.clearInterval(id);
  }, [stepMs]);
  return now;
}

/* Fake pick text under the blur. The real selection never reaches an
 * anonymous viewer; this only gives the blur a pick-shaped silhouette. */
const DECOYS = [
  "Team -3.5  -110  2u",
  "Over 47.5  -105  1u",
  "Team ML  +140  1.5u",
  "Under 8.5  -115  1u",
];

export function SummaryRow({
  ticket,
  index,
}: {
  ticket: SummaryTicket;
  index: number;
}) {
  const decoy =
    ticket.legs > 1
      ? `${ticket.legs}-leg parlay  +595  1u`
      : DECOYS[index % DECOYS.length];
  return (
    <div className="flex items-center gap-4 py-3">
      <LeagueMark sport={ticket.sport} eligible className="h-[22px]" />
      <span className="sr-only">{ticket.sport}</span>
      <span
        aria-hidden="true"
        className="min-w-0 flex-1 truncate select-none text-[14px] font-bold text-[var(--color-text)]"
        style={{ filter: "blur(5px)", userSelect: "none" }}
      >
        {decoy}
      </span>
      <span className="shrink-0 text-[12px] font-medium text-[var(--color-text-muted)] tabular-nums">
        Reveals {formatRevealPhrase(ticket.reveal_at)}
      </span>
      <span
        aria-label="Locked"
        className="shrink-0 text-[var(--color-vip-text)]"
      >
        <LockGlyph />
      </span>
    </div>
  );
}

function stakeOf(units: number | null): string | null {
  return units != null && units > 0 ? formatStake(units) : null;
}

function signedOdds(o: number): string {
  return o > 0 ? `+${o}` : String(o);
}

/** "Red Sox +120 · 1u", "LAL -3 + Over 224.5 · +264 · 2u": a fixed
 *  ticket as first posted. */
export function originalSummary(o: VipOriginal): string {
  const parlay = o.legs.length > 1;
  const leg = (l: VipOriginal["legs"][number]) => {
    const parts = [vipSelection(l)];
    if (l.line != null) parts.push(/spread/.test(l.stat_name ?? "") ? signedOdds(l.line) : String(l.line));
    if (!parlay && l.odds_taken != null) parts.push(signedOdds(l.odds_taken));
    return parts.join(" ");
  };
  const price = parlay && o.combined_odds != null ? ` · ${signedOdds(o.combined_odds)}` : "";
  const units = o.units != null ? ` · ${formatStake(o.units)}` : "";
  return `${o.legs.map(leg).join(" + ")}${price}${units}`;
}

/* Shared row frame for unlocked picks: league mark, the pick, the game under
 * it, and when it goes public on the right. Same rhythm as SummaryRow so the
 * locked and unlocked views read as one list. */
export interface PickBy {
  avatar: React.ReactNode;
  name: React.ReactNode;
}

function UnlockedRow({
  pick,
  title,
  stake,
  by,
  children,
}: {
  pick: VipLockedPick;
  title: string;
  stake: string | null;
  /** Who posted it, for feeds that mix cappers (My Tails): the avatar takes
   *  the left column and the league mark drops into the game line. */
  by?: PickBy;
  children?: React.ReactNode;
}) {
  // Before start the game line says when it starts; once underway the
  // time gives way to a Started tag (not "Live": history uses Live for
  // in-game bets, and VIP picks are always pregame).
  const now = useNow();
  const started = !pick.pulled && !!pick.commence_time && new Date(pick.commence_time).getTime() <= now;
  const game = [
    pick.matchup,
    pick.commence_time && !started && `Starts ${formatRevealTime(pick.commence_time)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex items-start gap-4 py-3">
      {by ? (
        <div className="shrink-0">{by.avatar}</div>
      ) : (
        <div className="flex h-[22px] w-[26px] shrink-0 justify-center">
          <LeagueMark sport={pick.sport} eligible className="h-[22px]" />
        </div>
      )}
      <span className="sr-only">{pick.sport}</span>
      <div className="min-w-0 flex-1">
        {by && <div className="mb-0.5">{by.name}</div>}
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={`truncate text-[14px] font-bold text-[var(--color-text)] ${pick.pulled ? "line-through opacity-60" : ""}`}>
            {title}
          </span>
          {pick.pulled && (
            <span
              className="shrink-0 px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[9px] uppercase tracking-[0.12em] font-bold text-[var(--color-text-muted)]"
              title="Pulled before the game started. It stays listed and counts as no action."
            >
              Pulled
            </span>
          )}
          {stake && (
            <span className="shrink-0 text-[12px] font-semibold text-[var(--color-text-soft)] tabular-nums">
              {stake}
            </span>
          )}
        </div>
        {(game || by || started) && (
          <div className="mt-0.5 flex items-center gap-1.5 min-w-0 text-[12px] text-[var(--color-text-muted)]">
            {by && (
              <LeagueMark sport={pick.sport} eligible className="h-[13px]" />
            )}
            <span className="truncate">{game}</span>
            {started && (
              <span
                className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded
                           text-[9px] uppercase tracking-[0.12em] font-bold
                           bg-[var(--color-vip-soft)] text-[var(--color-vip-text)]"
                title="The game has started. This pick is locked in and can no longer be fixed or pulled."
              >
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--color-vip-text)] animate-pulse" />
                Started
              </span>
            )}
          </div>
        )}
        {children}
        {pick.original && (
          <div className="mt-1 truncate text-[11px] text-[var(--color-text-muted)]">
            Original: <span className="line-through">{originalSummary(pick.original)}</span>
          </div>
        )}
      </div>
      <span className="shrink-0 pt-0.5 text-[12px] font-medium text-[var(--color-text-muted)] tabular-nums">
        Public {formatRevealPhrase(pick.reveal_at)}
      </span>
    </div>
  );
}

/* Subscriber/owner straight pick. */
export function LockedPickRow({
  pick,
  by,
}: {
  pick: VipLockedPick;
  by?: PickBy;
}) {
  const title = formatBetDescriptor({
    kind: "straight",
    market: pick.market,
    selection: vipSelection(pick),
    line: pick.line,
    odds_taken: pick.odds_taken,
  });
  return (
    <UnlockedRow
      pick={pick}
      title={title}
      stake={stakeOf(pick.units)}
      by={by}
    />
  );
}

/* One parlay ticket. The platform stores combined_odds and units on leg 0
 * only (core/manual_bet.py); when leg 0 carries odds and no other leg does,
 * that is the ticket price and the legs render without odds. Legs sit under
 * the ticket line with a VIP rule on the left so they read as one bet. */
export function LockedParlayRow({
  legs,
  by,
}: {
  legs: VipLockedPick[];
  by?: PickBy;
}) {
  const lead = legs.find((l) => l.parlay_leg_index === 0) ?? legs[0];
  const combined =
    lead.odds_taken != null &&
    legs.every((l) => l === lead || l.odds_taken == null);
  const name = formatBetDescriptor({ kind: "parlay", leg_count: legs.length });
  const title =
    combined && lead.odds_taken != null
      ? `${name} ${signedOdds(lead.odds_taken)}`
      : name;
  // The ticket line shows when the first leg starts; each leg names its game.
  const starts = legs
    .map((l) => l.commence_time)
    .filter((t): t is string => Boolean(t))
    .sort();
  return (
    <UnlockedRow
      pick={{ ...lead, matchup: null, commence_time: starts[0] ?? null }}
      title={title}
      stake={stakeOf(lead.units)}
      by={by}
    >
      <ul className="mt-2 flex flex-col gap-1.5 border-l-2 border-[rgba(196,181,253,0.35)] pl-3">
        {legs.map((l) => (
          <li key={l.id} className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-[var(--color-text-soft)]">
              {formatBetDescriptor({
                kind: "parlay_leg",
                market: l.market,
                selection: vipSelection(l),
                line: l.line,
                odds_taken: combined ? null : l.odds_taken,
              })}
            </div>
            {l.matchup && (
              <div className="truncate text-[11px] text-[var(--color-text-muted)]">
                {l.matchup}
              </div>
            )}
          </li>
        ))}
      </ul>
    </UnlockedRow>
  );
}

/** Ticket rows for picks the viewer may see in full. */
export function LockedTicketList({ tickets }: { tickets: LockedTicket[] }) {
  return (
    <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.06)]">
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

export function LockedHeader({
  count,
  unlocked = false,
  className = "mb-3",
}: {
  count: number;
  unlocked?: boolean;
  className?: string;
}) {
  const label = unlocked
    ? `${count} ${count === 1 ? "pick" : "picks"}`
    : `${count} locked`;
  return (
    <div
      role="heading"
      aria-level={3}
      aria-label={`VIP · ${label}`}
      className={`flex items-center gap-2 ${className}`}
    >
      {unlocked ? (
        <VipCrown className="w-4 h-4" />
      ) : (
        <span aria-hidden="true" className="text-[var(--color-vip-text)]">
          <LockGlyph />
        </span>
      )}
      <span aria-hidden="true" className={EYEBROW}>
        <span className="text-[var(--color-vip-text)]">VIP</span> · {label}
      </span>
    </div>
  );
}

export function LockedPicks({
  status,
  bare = false,
}: {
  status: VipCapperStatus;
  bare?: boolean;
}) {
  const locked: Array<VipLockedSummary | VipLockedPick> = status.locked;
  if (locked.length === 0) return null;
  const canSee = status.viewer.subscribed || status.viewer.is_owner;
  const full = canSee ? locked.filter(isLockedPick) : [];
  const showFull = canSee && full.length === locked.length;

  const tickets = showFull ? groupLockedTickets(full) : [];
  const summary = showFull ? [] : groupSummaryTickets(locked.map(toSummary));

  return (
    <section
      className={
        bare
          ? "px-5 sm:px-6 pt-3 pb-1"
          : "rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4"
      }
    >
      <LockedHeader
        count={showFull ? tickets.length : summary.length}
        unlocked={showFull}
        className={bare ? "mb-0" : "mb-3"}
      />
      {showFull ? (
        <LockedTicketList tickets={tickets} />
      ) : (
        <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.06)]">
          {summary.map((t, i) => (
            <SummaryRow key={t.key} ticket={t} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
