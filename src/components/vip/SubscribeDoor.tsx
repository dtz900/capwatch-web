"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipApiError, getVipCapperStatus, startVipCheckout } from "@/lib/vip/client";
import { SUBSCRIBER_TERMS_VERSION, subscriberDisclosure } from "@/lib/vip/terms";
import type { VipCapperStatus } from "@/lib/vip/types";
import { ManageSubscriptionLink } from "./ManageSubscriptionLink";
import { VipPrice } from "./VipBand";
import { DOOR_CLOSED, formatPrice } from "./format";
import { ERROR_TEXT, VIP_PRIMARY_BTN } from "./styles";

const RETURN_COOKIE = "ts_return_to";

/** Right slot of the VIP header. Open door: price and Subscribe. Subscriber:
 *  a quiet Subscribed status (canceling happens through Manage subscription, the Stripe portal). Owner or closed door: nothing (the body says why). */
export function SubscribeDoor({
  status,
  handle,
  capperId,
}: {
  status: VipCapperStatus;
  handle: string;
  capperId: number;
}) {
  const { seller } = status;
  const { is_owner: isOwner, subscribed } = status.viewer;

  if (isOwner) return null;
  if (subscribed)
    return (
      // Phone: stacked, so the portal hint gets the full width.
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
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
      {status.viewer.billing === "stripe" && seller && (
        <ManageSubscriptionLink capperId={capperId} />
      )}
      </div>
    );
  // A live Stripe subscription with no access still exists at Stripe: manage it
  // in the portal, never start a second one. The payload carries no reason (a
  // failed card, a seller restriction, a cold or silent pause all look the same
  // here), so the copy names the state, not a cause the viewer cannot fix.
  if (status.viewer.billing === "stripe")
    return (
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="text-[12px] font-bold text-[var(--color-vip-text)]">
          Subscription paused
        </span>
        <ManageSubscriptionLink capperId={capperId} />
      </div>
    );
  if (!seller) return null;
  if (!status.door_open)
    // Only the off-season closure gets a line: it's the one a visitor can't
    // read off the card (the badge still says eligible) and it has a date.
    return status.door_closed_reason === "off_season" ? (
      <span className="text-[12px] leading-snug text-[var(--color-text-muted)] sm:max-w-[260px]">
        {DOOR_CLOSED.off_season}
      </span>
    ) : null;
  return (
    // Phone: price left, Subscribe fills the rest of the row.
    <div className="flex items-center gap-4">
      <VipPrice cents={seller.price_cents} />
      <Link
        href={`/cappers/${encodeURIComponent(handle)}/subscribe`}
        className={`${VIP_PRIMARY_BTN} flex-1 sm:flex-none`}
      >
        Subscribe
      </Link>
    </div>
  );
}

/** Checkout block on the subscribe page: disclosure, consent, Subscribe.
 *  Signed out sends the visitor to sign in and back here. */
export function SubscribeCheckout({
  status,
  handle,
  capperId,
}: {
  status: VipCapperStatus;
  handle: string;
  capperId: number;
}) {
  const { session, authReady } = useAuth();
  const router = useRouter();
  const token = session?.access_token ?? null;
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const { seller } = status;
  // The page's status is fetched without a token, so it never knows this
  // viewer pays. Ask with their token before offering Subscribe: a payer
  // must never be one click from a second subscription.
  const userId = session?.user?.id ?? null;
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  const [viewer, setViewer] = useState<VipCapperStatus["viewer"] | null>(null);
  // The viewer's own status could not be read: Subscribe is withheld and a
  // Retry offered, never a guess that this viewer does not already pay.
  const [viewerFailed, setViewerFailed] = useState(false);
  // Bumped when the page comes back from the bfcache (the viewer may have paid
  // since) and by Retry: the old status must not offer Subscribe again.
  const [recheck, setRecheck] = useState(0);
  // An expired token (a page restored after a sleep) reads as anonymous at the
  // platform; wait for supabase-js to refresh it before asking.
  const expired =
    typeof session?.expires_at === "number" && session.expires_at * 1000 <= Date.now();
  useEffect(() => {
    // Another user (or signed out), a restored page, a retry: drop the previous
    // viewer's state and hold Subscribe until this one's status lands.
    setViewer(null);
    setManage(false);
    setViewerFailed(false);
    if (!authReady || !userId || expired) return;
    let cancelled = false;
    getVipCapperStatus(capperId, tokenRef.current)
      .then((s) => {
        if (!cancelled) setViewer(s.viewer);
      })
      .catch((err: unknown) => {
        console.error("VIP viewer status failed", err);
        if (!cancelled) setViewerFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, userId, capperId, expired, recheck]);

  // After location.assign, bfcache Back restores this page with pending stuck
  // and a status from before the payment.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setPending(false);
      setRecheck((n) => n + 1);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // The hero #subscribe anchor lands here: move focus to the checkout block.
  const blockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const focusIfHash = () => {
      // The anchor already scrolled (clear of the sticky header via scroll-mt);
      // a plain focus() would scroll again and bury the block under it.
      if (window.location.hash === "#subscribe") blockRef.current?.focus({ preventScroll: true });
    };
    focusIfHash();
    window.addEventListener("hashchange", focusIfHash);
    return () => window.removeEventListener("hashchange", focusIfHash);
  }, []);

  if (!seller) return null;

  const subscribePath = `/cappers/${encodeURIComponent(handle)}/subscribe`;
  const paymentsOn = status.payments_enabled === true;
  const label = `Subscribe · $${formatPrice(seller.price_cents)}/mo`;

  const billing = viewer?.billing ?? status.viewer.billing;
  if (manage || billing === "stripe" || viewer?.subscribed) {
    return (
      <div id="subscribe" ref={blockRef} tabIndex={-1} className="scroll-mt-28 flex flex-col items-start gap-1.5 outline-none">
        <p className="text-[13px] text-[var(--color-text-soft)]">You are already subscribed.</p>
        {(manage || billing === "stripe") && <ManageSubscriptionLink capperId={capperId} />}
      </div>
    );
  }
  // Signed in, own status still in flight: hold Subscribe.
  const checking = !!session && viewer === null && !viewerFailed;

  const signIn = () => {
    document.cookie = `${RETURN_COOKIE}=${encodeURIComponent(subscribePath)}; path=/; max-age=1800; samesite=lax`;
    router.push(`/login?next=${encodeURIComponent(subscribePath)}`);
  };

  const subscribe = async () => {
    if (pending || !paymentsOn || !agreed || checking) return;
    setPending(true);
    setError(null);
    try {
      const { url } = await startVipCheckout(capperId, SUBSCRIBER_TERMS_VERSION, token);
      window.location.assign(url);
    } catch (err) {
      const detail = err instanceof VipApiError ? err.detail : "";
      if (detail === "already_subscribed") {
        // The viewer's own status was unknown (its call failed) or stale. Ask
        // again: Manage subscription only exists for a Stripe subscriber; an
        // admin comp has no portal to open.
        try {
          setViewer((await getVipCapperStatus(capperId, tokenRef.current)).viewer);
        } catch {
          setManage(true);
        }
      } else if (detail === "not_selling") setError(DOOR_CLOSED.not_selling);
      else if (detail === "own_capper") setError("This is your own VIP.");
      else {
        console.error("VIP checkout failed", err);
        setError("Something went wrong. Try again.");
      }
      setPending(false);
    }
  };

  if (!session) {
    return (
      <div id="subscribe" ref={blockRef} tabIndex={-1} className="scroll-mt-28 flex flex-col items-start gap-1.5 outline-none">
        <button
          type="button"
          disabled={!authReady || !paymentsOn}
          onClick={signIn}
          className={`${VIP_PRIMARY_BTN} h-12 px-8 text-[12px] whitespace-nowrap w-full sm:w-auto`}
        >
          {label}
        </button>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {paymentsOn ? "Sign in to subscribe." : "Checkout opens soon."}
        </span>
      </div>
    );
  }

  if (viewerFailed) {
    return (
      <div id="subscribe" ref={blockRef} tabIndex={-1} className="scroll-mt-28 flex flex-col items-start gap-1.5 outline-none">
        <p className="text-[13px] text-[var(--color-text-soft)]">
          Could not check your subscription.
        </p>
        <button
          type="button"
          onClick={() => setRecheck((n) => n + 1)}
          className={`${VIP_PRIMARY_BTN} h-12 px-8 text-[12px] whitespace-nowrap w-full sm:w-auto`}
        >
          Retry
        </button>
      </div>
    );
  }

  // Subscribe stays off until the platform enables payments for this capper
  // (payments_enabled), so no checkout call is ever made while dark.
  return (
    <div id="subscribe" ref={blockRef} tabIndex={-1} className="scroll-mt-28 flex flex-col items-start gap-3 sm:max-w-[420px] outline-none">
      <p className="text-[12px] leading-snug text-[var(--color-text-soft)]">
        {subscriberDisclosure(seller.price_cents)}
      </p>
      <label className="flex items-start gap-2 text-[12px] leading-snug text-[var(--color-text-soft)]">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">
            Terms
            <span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          and understand this renews monthly until I cancel.
        </span>
      </label>
      <button
        type="button"
        disabled={!agreed || pending || !paymentsOn || checking}
        onClick={subscribe}
        className={`${VIP_PRIMARY_BTN} h-12 px-8 text-[12px] whitespace-nowrap w-full sm:w-auto`}
      >
        {checking ? "Checking…" : label}
      </button>
      {!paymentsOn && (
        <span className="text-[11px] text-[var(--color-text-muted)]">Checkout opens soon.</span>
      )}
      {error && (
        <span role="status" className={ERROR_TEXT}>
          {error}
        </span>
      )}
    </div>
  );
}
