"use client";

import type { VipLockedPick, VipLockedSummary } from "@/lib/vip/types";
import { SummaryRow, groupSummaryTickets } from "./LockedPicks";

function toSummary(p: VipLockedSummary | VipLockedPick): VipLockedSummary {
  return "pick_id" in p
    ? p
    : { pick_id: p.id, sport: p.sport, reveal_at: p.reveal_at, posted_at: p.posted_at };
}

/** Subscribe page: the picks waiting behind the paywall, blurred, with a
 *  count headline. Render only when there are locked picks. */
export function VipLockedTeaser({ locked }: { locked: Array<VipLockedSummary | VipLockedPick> }) {
  const tickets = groupSummaryTickets(locked.map(toSummary));
  const n = tickets.length;
  if (n === 0) return null;
  return (
    <div className="px-5 sm:px-6 pt-5 pb-2">
      <h2 className="text-[17px] font-extrabold text-[var(--color-text)]">
        {n} {n === 1 ? "pick" : "picks"} waiting
      </h2>
      <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
        Subscribers have these now. Everyone else sees them after the game starts.
      </p>
      <div className="mt-1 flex flex-col divide-y divide-[rgba(255,255,255,0.07)]">
        {tickets.map((t, i) => (
          <SummaryRow key={t.key} ticket={t} index={i} />
        ))}
      </div>
    </div>
  );
}
