"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getVipCapperStatus } from "@/lib/vip/client";
import type { VipCapperStatus } from "@/lib/vip/types";
import { EligibilityBadges } from "./EligibilityBadges";
import { LockedPicks } from "./LockedPicks";
import { SubscribeDoor } from "./SubscribeDoor";
import { signedUnits } from "./format";

function recordLine(r: VipCapperStatus["vip_record"]): string {
  const pushes = r.pushes > 0 ? `-${r.pushes}` : "";
  return `VIP picks: ${r.wins}-${r.losses}${pushes}, ${signedUnits(r.units)}`;
}

function isEmpty(s: VipCapperStatus): boolean {
  return s.seller === null && s.eligibility.length === 0 && s.locked.length === 0;
}

export function CapperVipSection({ capperId, handle }: { capperId: number; handle: string }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [status, setStatus] = useState<VipCapperStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVipCapperStatus(capperId, token)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((err: unknown) => {
        // A VIP outage must never break the public profile: log and hide.
        console.error("capper VIP status failed", err);
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [capperId, token]);

  if (!status || isEmpty(status)) return null;

  // With the door closed, SubscribeDoor already shows the closed pills in its
  // slot, so the badge row keeps only the eligible sports.
  const doorClosed = status.seller !== null && !status.door_open;
  const badges = doorClosed ? status.eligibility.filter((e) => e.eligible) : status.eligibility;
  const showCard = status.seller !== null || status.eligibility.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {showCard && (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-2.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
                  Capper VIP
                </span>
              </div>
              <EligibilityBadges eligibility={badges} />
              {status.vip_record.n > 0 && (
                <div className="text-[12px] font-semibold text-[var(--color-text-soft)]">
                  {recordLine(status.vip_record)}
                </div>
              )}
            </div>
            <div className="shrink-0">
              <SubscribeDoor status={status} handle={handle} />
            </div>
          </div>
        </section>
      )}
      <LockedPicks status={status} />
    </div>
  );
}
