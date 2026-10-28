"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipApiError, getVipCapperStatus } from "@/lib/vip/client";
import type { VipCapperStatus } from "@/lib/vip/types";
import { Tooltip } from "@/components/common/Tooltip";
import { ELIGIBILITY_TOOLTIP, EligibilityBadges } from "./EligibilityBadges";
import { LockedPicks } from "./LockedPicks";
import { OwnerPanel } from "./OwnerPanel";
import { SubscribeDoor } from "./SubscribeDoor";
import { VipBand } from "./VipBand";
import { signedUnits, vipHeadline } from "./format";
import { EYEBROW } from "./styles";

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
  return <CapperVipView status={status} handle={handle} ownerPanel={ownerPanel} />;
}

function VipRecord({ record }: { record: VipCapperStatus["vip_record"] }) {
  if (record.n <= 0) {
    return (
      <span className="text-[12px] font-medium text-[var(--color-text-muted)]">
        No VIP picks graded yet
      </span>
    );
  }
  const pushes = record.pushes > 0 ? `-${record.pushes}` : "";
  const tone =
    record.units > 0
      ? "text-[var(--color-pos)]"
      : record.units < 0
        ? "text-[var(--color-neg)]"
        : "text-[var(--color-text)]";
  return (
    <div role="group" aria-label={recordLine(record)} className="flex items-baseline gap-3 flex-wrap">
      <span className={EYEBROW}>VIP record</span>
      <span className="text-[15px] font-extrabold tabular-nums text-[var(--color-text)]">
        {record.wins}-{record.losses}
        {pushes}
      </span>
      <span className={`text-[15px] font-extrabold tabular-nums ${tone}`}>{signedUnits(record.units)}</span>
    </div>
  );
}

const STEPS = [
  "Picks post inside TailSlips",
  "Locked to subscribers until 30 min after tip",
  "Then graded like every other pick",
];

function HowItWorks() {
  return (
    <ol className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
      {STEPS.map((step, i) => (
        <li key={step} className="inline-flex items-center gap-2">
          {i > 0 && (
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
          )}
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-sm bg-[var(--color-vip)]" />
          {step}
        </li>
      ))}
    </ol>
  );
}

/** Presentational profile section for a loaded status (the fixtures page
 *  renders it with mock payloads). */
export function CapperVipView({
  status,
  handle,
  ownerPanel = null,
}: {
  status: VipCapperStatus | null;
  handle: string;
  ownerPanel?: ReactNode;
}) {
  if (!status || isEmpty(status)) {
    return ownerPanel ? <div className="flex flex-col gap-3">{ownerPanel}</div> : null;
  }

  const showCard = status.seller !== null || status.eligibility.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {ownerPanel}
      {showCard && (
        <section
          aria-label="Capper VIP"
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
        >
          <VipBand
            headline={vipHeadline(status)}
            right={<SubscribeDoor status={status} handle={handle} />}
          />
          <div className="px-5 py-4">
            <div className="mb-3">
              <Tooltip content={ELIGIBILITY_TOOLTIP}>
                <span className={`${EYEBROW} cursor-help`}>Last 30 days by sport</span>
              </Tooltip>
            </div>
            <EligibilityBadges eligibility={status.eligibility} />
            <HowItWorks />
            <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3 flex-wrap">
              <VipRecord record={status.vip_record} />
            </div>
          </div>
        </section>
      )}
      <LockedPicks status={status} />
    </div>
  );
}
