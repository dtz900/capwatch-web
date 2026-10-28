"use client";

import Link from "next/link";
import type { VipCapperStatus } from "@/lib/vip/types";
import { formatPrice } from "./format";
import { DOOR_CHIP_MUTED, DOOR_CHIP_SUBSCRIBED, PRIMARY_BTN } from "./styles";

/** Right slot of the VIP footer. The per-sport reasons live on the
 *  eligibility cards, so a closed door is one muted chip. */
export function SubscribeDoor({ status, handle }: { status: VipCapperStatus; handle: string }) {
  const { seller } = status;
  const { is_owner: isOwner, subscribed } = status.viewer;

  // The owner never subscribes to themselves.
  if (isOwner) return null;
  if (subscribed) return <span className={DOOR_CHIP_SUBSCRIBED}>Subscribed</span>;
  if (!seller || !status.door_open) {
    return <span className={DOOR_CHIP_MUTED}>Not selling right now</span>;
  }
  return (
    <Link href={`/cappers/${encodeURIComponent(handle)}/subscribe`} className={PRIMARY_BTN}>
      Subscribe · ${formatPrice(seller.price_cents)}/mo
    </Link>
  );
}
