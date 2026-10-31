"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipApiError, getVipCapperStatus, pullVipPick } from "@/lib/vip/client";
import { stripVipParam } from "@/lib/vip/returnParam";
import type { VipCapperStatus } from "@/lib/vip/types";
import { EligibilityBadges } from "./EligibilityBadges";
import { LockedPicks, type PullFn } from "./LockedPicks";
import { OwnerPanel } from "./OwnerPanel";
import { SubscribeDoor } from "./SubscribeDoor";
import { useVipInitialStatus } from "./VipInitialStatus";
import { VipBand, VipGlassCard } from "./VipBand";
import { exclusivityLine, signedUnits, vipHeadline } from "./format";
import { EYEBROW, INNER_CARD, VIP_GLASS_DIVIDER } from "./styles";

function recordLine(r: VipCapperStatus["vip_record"]): string {
  const pushes = r.pushes > 0 ? `-${r.pushes}` : "";
  return `VIP picks: ${r.wins}-${r.losses}${pushes}, ${signedUnits(r.units)}`;
}

/** After Stripe Checkout the webhook may land a moment after the redirect. */
const CHECKOUT_POLL_MS = 3000;
const CHECKOUT_POLL_MAX_MS = 30000;
/** Access can end any time (refund, dispute, cancel): re-read the status this
 *  often while the tab is visible, and whenever it becomes visible again. */
const ACCESS_RECHECK_MS = 30000;

function isEmpty(s: VipCapperStatus): boolean {
  return (
    s.seller === null && s.eligibility.length === 0 && s.locked.length === 0
  );
}

export function CapperVipSection({
  capperId,
  handle,
}: {
  capperId: number;
  handle: string;
}) {
  const { session, capper, authReady } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const [status, setStatus] = useState<VipCapperStatus | null>(null);
  // Bumped by the owner panel after a post or seller change.
  const [reload, setReload] = useState(0);
  const refetch = useCallback(() => setReload((n) => n + 1), []);
  // True after returning from Stripe Checkout (?vip=subscribed), until access
  // shows or the poll times out.
  const [returned, setReturned] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef(false);
  useEffect(() => {
    pollingRef.current = polling;
  }, [polling]);
  const viewerKey = useRef<string | null>(null);
  // Read at request time so a token refresh (same user, new access_token)
  // neither refetches nor resets the section. Declared before the fetch
  // effect so it is current when that effect runs.
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Every status request takes a number; a response lands only if nothing
  // newer has, so a slow re-check can never undo a fresher answer (e.g. flip
  // Subscribed back to Subscribe) and the checkout poll never cancels itself.
  const seqRef = useRef(0);
  const appliedRef = useRef(0);
  // The browser's own call failed: show the public card rather than freezing
  // on the held-back first paint; the re-check keeps trying.
  const [clientFailed, setClientFailed] = useState(false);
  const fetchStatus = useCallback(
    (key: string, onError: "hide" | "keep") => {
      const seq = ++seqRef.current;
      getVipCapperStatus(capperId, tokenRef.current)
        .then((s) => {
          if (viewerKey.current !== key || seq <= appliedRef.current) return;
          appliedRef.current = seq;
          setStatus(s);
          setClientFailed(false);
        })
        .catch((err: unknown) => {
          // A VIP outage must never break the public profile: log and hide.
          // 404 (capper or route not found) is an expected "nothing to show".
          if (!(err instanceof VipApiError && err.status === 404)) {
            console.error("capper VIP status failed", err);
          }
          if (onError === "keep" || viewerKey.current !== key || seq <= appliedRef.current) return;
          // While polling after checkout, one failed request keeps the last good status.
          if (pollingRef.current) return;
          appliedRef.current = seq;
          setStatus(null);
          setClientFailed(true);
        });
    },
    [capperId],
  );

  useEffect(() => {
    // Before the first getSession() lands every viewer looks anonymous;
    // wait so a subscriber is not served the locked summary first.
    if (!authReady) return;
    // Drop the previous viewer's payload (e.g. a subscriber who just signed
    // out) while the refetch for the new user is in flight. An owner-panel
    // reload keeps the current payload on screen until the new one lands.
    const key = `${capperId}:${userId ?? ""}`;
    if (viewerKey.current !== key) {
      viewerKey.current = key;
      appliedRef.current = seqRef.current;
      setStatus(null);
      setClientFailed(false);
    }
    fetchStatus(key, "hide");
  }, [capperId, userId, authReady, reload, fetchStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("vip") !== "subscribed") return;
    stripVipParam(params);
    setReturned(true);
    setPolling(true);
  }, []);

  // The platform's word on ownership (cappers.claimed_by_user_id) wins: an
  // owner linked without X verification has no claimed capper on the
  // session. The session claim still counts before the status lands.
  const isOwner = capper?.id === capperId || status?.viewer.is_owner === true;
  // Until this viewer's own status lands, paint the server's anonymous one
  // with the viewer-specific parts (Subscribe/Subscribed, picks) held back.
  // Not for a known owner: their dashboard replaces the public card.
  const initial = useVipInitialStatus();
  const viewerPending =
    status === null && initial !== null && !clientFailed && capper?.id !== capperId;
  const shown = status ?? (viewerPending || clientFailed ? initial : null);

  // Background re-check: success replaces the status (picks go the moment access
  // ends); a failure keeps what is on screen rather than blanking the section.
  const showing = shown !== null && !isEmpty(shown);
  useEffect(() => {
    if (!showing) return;
    const key = viewerKey.current;
    if (key === null) return;
    const recheck = () => {
      if (document.visibilityState === "hidden") return;
      fetchStatus(key, "keep");
    };
    const tick = setInterval(recheck, ACCESS_RECHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [showing, capperId, userId, fetchStatus]);

  const hasAccess = status?.viewer.subscribed === true;
  useEffect(() => {
    if (!polling) return;
    if (hasAccess) {
      setPolling(false);
      return;
    }
    const tick = setInterval(refetch, CHECKOUT_POLL_MS);
    const stop = setTimeout(() => setPolling(false), CHECKOUT_POLL_MAX_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
  }, [polling, hasAccess, refetch]);
  // Just back from Checkout and access not showing yet: never offer Subscribe
  // beside "You're in" (the webhook may simply be late).
  const holdDoor = viewerPending || (returned && !hasAccess);
  // Set by the owner panel once its selling dashboard is actually on screen.
  const [ownerDashboard, setOwnerDashboard] = useState(false);
  const ownerPanel = isOwner ? (
    <OwnerPanel
      onChanged={refetch}
      eligibility={status?.eligibility}
      vipRecord={status?.vip_record}
      exclusivity={status ? exclusivityLine(status) : null}
      onDashboard={setOwnerDashboard}
      status={status}
    />
  ) : null;
  const onPull: PullFn | undefined = isOwner
    ? async (ticketId) => {
        await pullVipPick(ticketId, tokenRef.current);
        refetch();
      }
    : undefined;
  return (
    <>
      {returned && (
        <div className={`${INNER_CARD} mb-3 text-[13px] text-[var(--color-text-soft)]`} role="status">
          You&apos;re in. VIP picks show here and arrive by email.
        </div>
      )}
      <CapperVipView
        status={shown}
        handle={handle}
        capperId={capperId}
        ownerPanel={ownerPanel}
        ownerDashboard={isOwner && ownerDashboard}
        onPull={onPull}
        viewerPending={holdDoor}
      />
    </>
  );
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
  return (
    <div
      role="group"
      aria-label={recordLine(record)}
      className="flex items-baseline gap-3 flex-wrap"
    >
      <span className={EYEBROW}>VIP record</span>
      <span className="text-[15px] font-extrabold tabular-nums text-[var(--color-text)]">
        {record.wins}-{record.losses}
        {pushes}
      </span>
      <span className="text-[15px] font-extrabold tabular-nums text-[var(--color-text)]">
        {signedUnits(record.units)}
      </span>
    </div>
  );
}

/** Presentational profile section for a loaded status (the fixtures page
 *  renders it with mock payloads). */
export function CapperVipView({
  status,
  handle,
  capperId,
  ownerPanel = null,
  ownerDashboard = false,
  onPull,
  viewerPending = false,
}: {
  status: VipCapperStatus | null;
  handle: string;
  capperId: number;
  ownerPanel?: ReactNode;
  /** The owner's selling dashboard is rendered: skip the public card. */
  ownerDashboard?: boolean;
  onPull?: PullFn;
  /** `status` is the anonymous first paint: hold back Subscribe/Subscribed
   *  and picks until the viewer's own status lands. */
  viewerPending?: boolean;
}) {
  if (!status || isEmpty(status)) {
    return ownerPanel ? (
      <div className="flex flex-col gap-3">{ownerPanel}</div>
    ) : null;
  }

  // A selling owner's dashboard carries the eligibility band and record, so the
  // public card would repeat it; their posted picks (with Pull) stay below.
  if (ownerPanel && ownerDashboard) {
    return (
      <div className="flex flex-col gap-3">
        {ownerPanel}
        {status.locked.length > 0 && <LockedPicks status={status} onPull={onPull} />}
      </div>
    );
  }

  const showCard = status.seller !== null || status.eligibility.length > 0;
  // Before selling, the eligible banner leads and the setup card follows.
  const panelAfterCard = status.seller === null;

  return (
    <div className="flex flex-col gap-3">
      {!panelAfterCard && ownerPanel}
      {showCard && (
        <section aria-label="Capper VIP">
          <VipGlassCard>
            <VipBand
              headline={vipHeadline(status)}
              exclusivity={exclusivityLine(status)}
              right={
                viewerPending ? (
                  // Same height as the Subscribe row, so nothing shifts when it lands.
                  <div aria-hidden="true" className="h-10" />
                ) : (
                  <SubscribeDoor status={status} handle={handle} capperId={capperId} />
                )
              }
            />
            <div className="px-5 sm:px-6 pb-3.5">
              <EligibilityBadges eligibility={status.eligibility} tiles />
            </div>
            {!viewerPending && status.locked.length > 0 && (
              <div
                className={`${VIP_GLASS_DIVIDER} relative`}
                style={{ backgroundColor: "#1e0f3a" }}
              >
                <LockedPicks status={status} bare onPull={onPull} />
              </div>
            )}
            <div
              className={`${VIP_GLASS_DIVIDER} px-5 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap`}
            >
              <VipRecord record={status.vip_record} />
              {/* VIP sits on top of the profile; free picks did not move. */}
              <span className="text-[12px] font-medium text-[var(--color-text-muted)]">
                Public picks are still in the same spot below
              </span>
            </div>
          </VipGlassCard>
        </section>
      )}
      {!showCard && !viewerPending && <LockedPicks status={status} onPull={onPull} />}
      {panelAfterCard && ownerPanel}
    </div>
  );
}
