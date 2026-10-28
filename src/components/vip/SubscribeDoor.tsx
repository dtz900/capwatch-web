"use client";

import Link from "next/link";
import type { VipCapperStatus } from "@/lib/vip/types";
import { EligibilityPill } from "./EligibilityBadges";
import { formatPrice } from "./format";

function SubscribedPill() {
  return (
    <span
      className="inline-flex items-center px-3 py-1.5 rounded-lg border border-[var(--color-border-h)]
                 text-[11px] font-bold tracking-[0.02em] text-[var(--color-text-soft)]"
    >
      Subscribed
    </span>
  );
}

export function SubscribeDoor({ status, handle }: { status: VipCapperStatus; handle: string }) {
  const { seller } = status;
  if (!seller) return null;
  const { is_owner: isOwner, subscribed } = status.viewer;

  // Door closed: every viewer sees why (CapperVipView drops these sports
  // from the badge row on that assumption). Only the link is viewer-gated.
  if (!status.door_open) {
    const closed = status.eligibility.filter((e) => !e.eligible);
    const showSubscribed = subscribed && !isOwner;
    if (closed.length === 0 && !showSubscribed) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {showSubscribed && <SubscribedPill />}
        {closed.map((row) => (
          <EligibilityPill key={row.sport} row={row} />
        ))}
      </div>
    );
  }

  // The owner never subscribes to themselves; a subscriber sees a pill.
  if (isOwner) return null;
  if (subscribed) return <SubscribedPill />;
  return (
    <Link
      href={`/cappers/${encodeURIComponent(handle)}/subscribe`}
      className="inline-flex items-center justify-center px-4 py-2 rounded-lg
                 bg-[var(--color-gold)] text-[#0a0a0c] text-[12px] font-bold tracking-[0.02em]
                 hover:opacity-90 transition"
    >
      Subscribe ${formatPrice(seller.price_cents)}/mo
    </Link>
  );
}
