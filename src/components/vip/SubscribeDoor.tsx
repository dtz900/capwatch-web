"use client";

import Link from "next/link";
import type { VipCapperStatus } from "@/lib/vip/types";
import { VipPrice } from "./VipBand";
import { VIP_PRIMARY_BTN } from "./styles";

/** Right slot of the VIP header. Open door: price and Subscribe. Subscriber:
 *  a quiet Subscribed status (cancelling lives in account settings). Owner or closed door: nothing (the body says why). */
export function SubscribeDoor({
  status,
  handle,
}: {
  status: VipCapperStatus;
  handle: string;
}) {
  const { seller } = status;
  const { is_owner: isOwner, subscribed } = status.viewer;

  if (isOwner) return null;
  if (subscribed)
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-vip-text)]">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
        Subscribed
      </span>
    );
  if (!seller || !status.door_open) return null;
  return (
    <div className="flex items-center gap-4">
      <VipPrice cents={seller.price_cents} />
      <Link
        href={`/cappers/${encodeURIComponent(handle)}/subscribe`}
        className={VIP_PRIMARY_BTN}
      >
        Subscribe
      </Link>
    </div>
  );
}
