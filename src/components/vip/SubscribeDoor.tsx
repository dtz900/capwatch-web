"use client";

import Link from "next/link";
import type { VipCapperStatus } from "@/lib/vip/types";
import { EligibilityPill } from "./EligibilityBadges";
import { formatPrice } from "./format";

export function SubscribeDoor({ status, handle }: { status: VipCapperStatus; handle: string }) {
  const { seller } = status;
  if (!seller) return null;

  if (status.door_open) {
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

  // Door closed: the closed eligibility copy takes the button's slot.
  const closed = status.eligibility.filter((e) => !e.eligible);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {closed.length > 0 ? (
        closed.map((row) => <EligibilityPill key={row.sport} row={row} />)
      ) : (
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full
                     bg-[rgba(255,255,255,0.04)] border border-[var(--color-border)]
                     text-[11px] font-bold text-[var(--color-text-muted)] tracking-[0.01em]"
        >
          Not currently selling
        </span>
      )}
    </div>
  );
}
