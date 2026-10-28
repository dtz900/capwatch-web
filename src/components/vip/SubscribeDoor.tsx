"use client";

import Link from "next/link";
import type { VipCapperStatus } from "@/lib/vip/types";
import { VipPrice } from "./VipBand";
import { VIP_BAND_CHIP, VIP_PRIMARY_BTN } from "./styles";

/** Right slot of the VIP band. Open door: price and Subscribe. Subscriber:
 *  a Subscribed chip. Owner or closed door: nothing (the body says why). */
export function SubscribeDoor({ status, handle }: { status: VipCapperStatus; handle: string }) {
  const { seller } = status;
  const { is_owner: isOwner, subscribed } = status.viewer;

  if (isOwner) return null;
  if (subscribed) return <span className={VIP_BAND_CHIP}>Subscribed</span>;
  if (!seller || !status.door_open) return null;
  return (
    <div className="flex items-center gap-4">
      <VipPrice cents={seller.price_cents} />
      <Link href={`/cappers/${encodeURIComponent(handle)}/subscribe`} className={VIP_PRIMARY_BTN}>
        Subscribe
      </Link>
    </div>
  );
}
