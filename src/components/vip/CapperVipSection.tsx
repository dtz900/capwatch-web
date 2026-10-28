"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipApiError, getVipCapperStatus } from "@/lib/vip/client";
import type { VipCapperStatus } from "@/lib/vip/types";
import { EligibilityBadges } from "./EligibilityBadges";
import { LockedPicks } from "./LockedPicks";
import { OwnerPanel } from "./OwnerPanel";
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
  const { session, capper, authReady } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const isOwner = capper?.id === capperId;
  const [status, setStatus] = useState<VipCapperStatus | null>(null);
  // Bumped by the owner panel after a post or seller change.
  const [reload, setReload] = useState(0);
  const refetch = useCallback(() => setReload((n) => n + 1), []);
  const viewerKey = useRef<string | null>(null);
  // Read at request time so a token refresh (same user, new access_token)
  // neither refetches nor resets the section. Declared before the fetch
  // effect so it is current when that effect runs.
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    // Before the first getSession() lands every viewer looks anonymous;
    // wait so a subscriber is not served the locked summary first.
    if (!authReady) return;
    let cancelled = false;
    // Drop the previous viewer's payload (e.g. a subscriber who just signed
    // out) while the refetch for the new user is in flight. An owner-panel
    // reload keeps the current payload on screen until the new one lands.
    const key = `${capperId}:${userId ?? ""}`;
    if (viewerKey.current !== key) {
      viewerKey.current = key;
      setStatus(null);
    }
    getVipCapperStatus(capperId, tokenRef.current)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((err: unknown) => {
        // A VIP outage must never break the public profile: log and hide.
        // 404 (capper or route not found) is an expected "nothing to show".
        if (!(err instanceof VipApiError && err.status === 404)) {
          console.error("capper VIP status failed", err);
        }
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [capperId, userId, authReady, reload]);

  const ownerPanel = isOwner ? <OwnerPanel onChanged={refetch} /> : null;
  if (!status || isEmpty(status)) {
    return ownerPanel ? <div className="flex flex-col gap-3">{ownerPanel}</div> : null;
  }

  // With the door closed, SubscribeDoor already shows the closed pills in its
  // slot, so the badge row keeps only the eligible sports.
  const doorClosed = status.seller !== null && !status.door_open;
  const badges = doorClosed ? status.eligibility.filter((e) => e.eligible) : status.eligibility;
  const showCard = status.seller !== null || status.eligibility.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {ownerPanel}
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
