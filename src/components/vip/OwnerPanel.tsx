"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getVipMe } from "@/lib/vip/client";
import type { VipCapperStatus, VipEligibility, VipMe } from "@/lib/vip/types";
import { SellerSetupCard } from "./SellerSetupCard";
import { SellerStrip } from "./SellerStrip";
import { PickBuilder } from "./builder/PickBuilder";
import { EYEBROW, VIP_PRIMARY_BTN } from "./styles";

const DENYLISTED_HANDLES = new Set(["fadeai_", "tailslips"]);

/** Owner-only panel on a capper's own profile: start selling, or the price line + composer. */
export function OwnerPanel({
  onChanged,
  eligibility,
  vipRecord,
  exclusivity,
  onDashboard,
}: {
  onChanged?: () => void;
  eligibility?: VipEligibility[];
  vipRecord?: VipCapperStatus["vip_record"] | null;
  exclusivity?: string | null;
  /** Told whether the selling dashboard is rendered. */
  onDashboard?: (shown: boolean) => void;
} = {}) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  // Read at request time: a token refresh for the same user must not
  // refetch or unmount the panel (and with it the composer draft).
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  // Tagged with the user it was fetched for, so a sign-out or account
  // switch never shows the previous owner's panel.
  const [loaded, setLoaded] = useState<{ userId: string; me: VipMe | null } | null>(null);
  const [tick, setTick] = useState(0);
  // Re-read /me (seller row, eligibility) and tell the section to refetch
  // the public status so the door and locked block match.
  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    onChanged?.();
  }, [onChanged]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getVipMe(tokenRef.current)
      .then((m) => {
        if (!cancelled) setLoaded({ userId, me: m });
      })
      .catch((err: unknown) => {
        // The owner panel must never break the public profile: log and hide.
        console.error("VIP me failed", err);
        if (!cancelled) setLoaded({ userId, me: null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  const me = userId && loaded?.userId === userId ? loaded.me : null;
  // House accounts never sell (the platform denylists them too).
  const denied = !!me?.capper && DENYLISTED_HANDLES.has(me.capper.handle.toLowerCase());
  // The selling dashboard is on screen: the section drops the public card it repeats.
  const dashboard = !!me?.capper && !denied && me.seller !== null;
  useEffect(() => {
    onDashboard?.(dashboard);
  }, [dashboard, onDashboard]);
  if (!me || !me.capper || denied) return null;

  return (
    <OwnerPanelView
      me={me}
      onRefresh={refresh}
      onPosted={() => onChanged?.()}
      eligibility={eligibility}
      vipRecord={vipRecord}
      exclusivity={exclusivity}
    />
  );
}

/** The builder under the dashboard; the band's Post a VIP pick opens it, so the
 *  capper's own profile reads like everyone else's on a normal visit. */
function Builder({ me, token, onPosted, onClose }: { me: VipMe; token: string; onPosted: () => void; onClose: () => void }) {
  return (
    <>
      <button
        type="button"
        className="self-end text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        onClick={onClose}
      >
        Close pick builder
      </button>
      <PickBuilder
        token={token}
        eligibleSports={me.can_post_sports}
        preferredBook={me.seller?.preferred_book}
        onPosted={onPosted}
      />
    </>
  );
}

/** Presentational owner panel for a loaded /me. `composerToken` lets the
 *  fixtures page show the builder without a signed-in session. */
export function OwnerPanelView({
  me,
  onRefresh,
  onPosted,
  composerToken,
  eligibility,
  vipRecord,
  exclusivity,
}: {
  me: VipMe;
  onRefresh: () => void;
  onPosted: () => void;
  composerToken?: string;
  eligibility?: VipEligibility[];
  vipRecord?: VipCapperStatus["vip_record"] | null;
  exclusivity?: string | null;
}) {
  const { session } = useAuth();
  const token = composerToken ?? session?.access_token ?? null;
  const [building, setBuilding] = useState(false);
  // Not selling yet: the purple setup card IS the dashboard, so it sits
  // under the label on its own rather than boxed inside another card.
  if (!me.seller) {
    return (
      <section aria-label="Your VIP dashboard" className="flex flex-col gap-2.5">
        <span className={EYEBROW}>Your VIP dashboard</span>
        <SellerSetupCard me={me} onDone={onRefresh} />
      </section>
    );
  }
  const canPost = me.can_post_sports.length > 0 && !!token;
  // Stopped and disabled sellers get no action in the band (it is hidden there).
  const postAction = canPost ? (
    <button type="button" className={VIP_PRIMARY_BTN} onClick={() => setBuilding(!building)}>
      {building ? "Close pick builder" : "Post a VIP pick"}
    </button>
  ) : (
    <span className="text-[12px] text-[var(--color-vip-text)]">You can post VIP picks once a sport is eligible.</span>
  );
  return (
    <div className="flex flex-col gap-3">
      <SellerStrip
        seller={me.seller}
        token={token}
        paymentsEnabled={me.payments_enabled}
        onSaved={onRefresh}
        eligibility={eligibility}
        vipRecord={vipRecord}
        exclusivity={exclusivity}
        postAction={postAction}
      />
      {building && canPost && token && (
        <Builder me={me} token={token} onPosted={onPosted} onClose={() => setBuilding(false)} />
      )}
    </div>
  );
}
