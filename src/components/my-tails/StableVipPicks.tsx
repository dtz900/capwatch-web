"use client";

import Link from "next/link";
import { formatBetDescriptor } from "@/lib/markets";
import { formatStake } from "@/lib/formatters";
import type { TodayPickEntry } from "@/lib/types";
import type { VipLockedPick, VipSubscription } from "@/lib/vip/types";
import { hasVipAccess } from "@/lib/vip/access";
import { parlayTicketOdds } from "@/lib/vip/odds";
import { useBetSlip } from "@/components/my-tails/BetSlipContext";
import {
  groupLockedTickets,
  type LockedTicket,
} from "@/components/vip/LockedPicks";
import { VipCrown } from "@/components/vip/VipCrown";
import { VIP_PRIMARY_BTN } from "@/components/vip/styles";
import { formatRevealTime } from "@/components/vip/format";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

/** One quiet status line for the stable card header. */
export function vipStatusLine(sub: VipSubscription): string {
  if (sub.status === "active") {
    return sub.current_period_end
      ? `VIP · renews ${shortDate(sub.current_period_end)}`
      : "VIP";
  }
  if (sub.status === "canceled") {
    return hasVipAccess(sub) && sub.current_period_end
      ? `VIP canceled · access until ${shortDate(sub.current_period_end)}`
      : "VIP canceled";
  }
  if (sub.pause_reason === "silent") return "VIP paused · no picks in 14 days";
  if (sub.pause_reason === "cold") return "VIP paused · not eligible to sell";
  return "VIP paused";
}

function signedOdds(o: number): string {
  return o > 0 ? `+${o}` : String(o);
}

function gameLine(p: VipLockedPick): string {
  return [p.matchup, p.commence_time && formatRevealTime(p.commence_time)]
    .filter(Boolean)
    .join(" · ");
}

/* Compact row for the narrow stable card: pick and stake on top, game under
 * it. Public timing is left to the profile; it is always 30 minutes after
 * the start. Same type scale as the card's Today rows. */
function VipTicketRow({
  ticket,
  sub,
}: {
  ticket: LockedTicket;
  sub: VipSubscription;
}) {
  const slipPick = toSlipPick(ticket, sub);
  if (ticket.kind === "straight") {
    const p = ticket.pick;
    const title = formatBetDescriptor({
      kind: "straight",
      market: p.market,
      selection: p.selection,
      line: p.line,
      odds_taken: p.odds_taken,
    });
    return (
      <li>
        <Line title={title} units={p.units} slipPick={slipPick} />
        <Meta>{gameLine(p)}</Meta>
      </li>
    );
  }
  const legs = ticket.legs;
  const lead = legs.find((l) => l.parlay_leg_index === 0) ?? legs[0];
  const combined =
    lead.odds_taken != null &&
    legs.every((l) => l === lead || l.odds_taken == null);
  const name = formatBetDescriptor({ kind: "parlay", leg_count: legs.length });
  const title =
    combined && lead.odds_taken != null
      ? `${name} ${signedOdds(lead.odds_taken)}`
      : name;
  return (
    <li>
      <Line title={title} units={lead.units} slipPick={slipPick} />
      <ul className="mt-1 ml-1 space-y-1 border-l border-[rgba(196,181,253,0.35)] pl-2.5">
        {legs.map((l) => (
          <li key={l.id} className="min-w-0">
            <div className="truncate text-xs font-semibold leading-tight text-[var(--color-text-soft)]">
              {formatBetDescriptor({
                kind: "parlay_leg",
                market: l.market,
                selection: l.selection,
                line: l.line,
                odds_taken: combined ? null : l.odds_taken,
              })}
            </div>
            {l.matchup && (
              <div className="truncate text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">
                {l.matchup}
              </div>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}

function Line({
  title,
  units,
  slipPick,
}: {
  title: string;
  units: number | null;
  slipPick: TodayPickEntry;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="truncate text-sm font-semibold leading-tight text-[var(--color-text)]">
        {title}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {units != null && units > 0 && (
          <span className="text-[10px] font-bold tabular-nums text-[var(--color-text-muted)]">
            {formatStake(units)}
          </span>
        )}
        <SlipToggle pick={slipPick} />
      </span>
    </div>
  );
}

/* Same add/remove as the card's Today rows, in VIP lavender. */
function SlipToggle({ pick }: { pick: TodayPickEntry }) {
  const slip = useBetSlip();
  if (!slip) return null;
  const on =
    pick.kind === "straight"
      ? slip.inSlip(pick.pick_id)
      : slip.inSlipParlay(pick.parlay_id);
  const stop = (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
  };
  if (on) {
    return (
      <button
        aria-label={`Remove ${pick.selection} from bet slip`}
        title="On your slip. Click to remove"
        onClick={(ev) => {
          stop(ev);
          const entry = slip.entries?.find((e) =>
            pick.kind === "straight"
              ? e.pick_id === pick.pick_id
              : e.parlay_id === pick.parlay_id,
          );
          if (entry) slip.removeEntry(entry.id);
        }}
        className="text-sm font-bold text-[var(--color-vip-text)]"
      >
        {"✓"}
      </button>
    );
  }
  return (
    <button
      aria-label={`Add ${pick.selection} to bet slip`}
      title="Add to bet slip"
      onClick={(ev) => {
        stop(ev);
        slip.addFromPick(pick);
      }}
      className="text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    >
      {"+"}
    </button>
  );
}

/* A VIP ticket in the shape the bet slip already takes from Today rows.
 * Selection text matches the public feed: no odds on straights (the slip
 * carries odds separately), "N-leg parlay" on parlays. */
function toSlipPick(
  ticket: LockedTicket,
  sub: VipSubscription,
): TodayPickEntry {
  const base = {
    capper_id: sub.capper.id,
    handle: sub.capper.handle,
    display_name: sub.capper.display_name,
    profile_image_url: sub.capper.profile_image_url,
    market_group: null,
    outcome: null,
    profit_units: null,
  };
  if (ticket.kind === "straight") {
    const p = ticket.pick;
    return {
      ...base,
      kind: "straight",
      matchup: p.matchup ?? null,
      market: p.market,
      selection: formatBetDescriptor({
        kind: "straight",
        market: p.market,
        selection: p.selection,
        line: p.line,
        odds_taken: null,
      }),
      line: p.line,
      odds_taken: p.odds_taken,
      commence_time: p.commence_time ?? null,
      units: p.units,
      posted_at: p.posted_at,
      pick_id: p.id,
      parlay_id: null,
    };
  }
  const legs = ticket.legs;
  const lead = legs.find((l) => l.parlay_leg_index === 0) ?? legs[0];
  return {
    ...base,
    kind: "parlay",
    matchup: null,
    market: "parlay",
    selection: formatBetDescriptor({ kind: "parlay", leg_count: legs.length }),
    line: null,
    // Combined price on leg 0, or the legs multiplied when each carries its
    // own price; never leg 0's price stamped on the whole ticket.
    odds_taken: parlayTicketOdds(legs),
    commence_time:
      legs
        .map((l) => l.commence_time)
        .filter((t): t is string => Boolean(t))
        .sort()[0] ?? null,
    units: lead.units,
    posted_at: lead.posted_at,
    pick_id: null,
    parlay_id: lead.parlay_id,
  };
}

function Meta({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="truncate text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
      {children}
    </div>
  );
}

/* Purple panel so VIP picks never read as the card's public Today picks. */
const VIP_PANEL = {
  backgroundImage:
    "linear-gradient(160deg, rgba(91,33,182,0.38) 0%, rgba(58,24,112,0.24) 55%, rgba(30,16,56,0.30) 100%)",
};

/** The VIP block on a subscribed capper's stable card. Paused or ended
 *  subscriptions show one line instead of picks. */
export function StableVipPicks({ sub }: { sub: VipSubscription }) {
  const access = hasVipAccess(sub);
  const tickets = access ? groupLockedTickets(sub.locked) : [];
  return (
    <div
      className={`mt-4 -mx-2 rounded-xl border px-3 py-3 ${
        access
          ? "border-[rgba(196,181,253,0.30)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "border-[rgba(196,181,253,0.14)]"
      }`}
      style={access ? VIP_PANEL : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-vip-text)]">
          <VipCrown className="w-3.5 h-3.5" />
          VIP picks
        </span>
        {tickets.length > 0 && (
          <span className="text-[10px] font-bold tabular-nums text-[var(--color-text-soft)]">
            {tickets.length} open
          </span>
        )}
      </div>
      {tickets.length > 0 ? (
        <ul className="mt-2 space-y-2.5">
          {tickets.map((t) => (
            <VipTicketRow key={t.key} ticket={t} sub={sub} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          {sub.status === "paused"
            ? "Billing is paused. You will not be charged until they are back."
            : access
              ? "No open VIP picks. You get an email the moment one drops."
              : "Your access has ended."}
        </p>
      )}
      {sub.status === "canceled" && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(196,181,253,0.18)] pt-3">
          <span className="text-[11px] text-[var(--color-text-soft)]">
            {access && sub.current_period_end
              ? `Ends ${shortDate(sub.current_period_end)}`
              : "Subscription ended"}
          </span>
          <Link
            href={`/cappers/${encodeURIComponent(sub.capper.handle)}/subscribe`}
            className={`${VIP_PRIMARY_BTN} h-8 px-4 text-[11px]`}
          >
            Resubscribe
          </Link>
        </div>
      )}
    </div>
  );
}

export { hasVipAccess };
