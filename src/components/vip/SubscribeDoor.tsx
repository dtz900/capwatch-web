"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipApiError, startVipCheckout } from "@/lib/vip/client";
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
      <div className="flex items-center gap-4">
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
  // A live Stripe subscription with no access (a failed card, a billing
  // pause) still bills: fix it in the portal, never start a second one.
  if (status.viewer.billing === "stripe")
    return (
      <div className="flex items-center gap-4">
        <span className="text-[12px] font-bold text-[var(--color-vip-text)]">
          Payment issue, update your card
        </span>
        <ManageSubscriptionLink capperId={capperId} />
      </div>
    );
  if (!seller || !status.door_open) return null;
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

  // After location.assign, bfcache Back restores this page with pending stuck.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // The hero #subscribe anchor lands here: move focus to the checkout block.
  const blockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const focusIfHash = () => {
      if (window.location.hash === "#subscribe") blockRef.current?.focus();
    };
    focusIfHash();
    window.addEventListener("hashchange", focusIfHash);
    return () => window.removeEventListener("hashchange", focusIfHash);
  }, []);

  if (!seller) return null;

  const subscribePath = `/cappers/${encodeURIComponent(handle)}/subscribe`;
  const paymentsOn = status.payments_enabled === true;
  const label = `Subscribe · $${formatPrice(seller.price_cents)}/mo`;

  if (manage || status.viewer.billing === "stripe") {
    return (
      <div id="subscribe" ref={blockRef} tabIndex={-1} className="flex flex-col items-start gap-1.5 outline-none">
        <p className="text-[13px] text-[var(--color-text-soft)]">You are already subscribed.</p>
        <ManageSubscriptionLink capperId={capperId} />
      </div>
    );
  }

  const signIn = () => {
    document.cookie = `${RETURN_COOKIE}=${encodeURIComponent(subscribePath)}; path=/; max-age=1800; samesite=lax`;
    router.push(`/login?next=${encodeURIComponent(subscribePath)}`);
  };

  const subscribe = async () => {
    if (pending || !paymentsOn || !agreed) return;
    setPending(true);
    setError(null);
    try {
      const { url } = await startVipCheckout(capperId, SUBSCRIBER_TERMS_VERSION, token);
      window.location.assign(url);
    } catch (err) {
      const detail = err instanceof VipApiError ? err.detail : "";
      if (detail === "already_subscribed") setManage(true);
      else if (detail === "not_selling") setError(DOOR_CLOSED.not_selling);
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
      <div id="subscribe" ref={blockRef} tabIndex={-1} className="flex flex-col items-start gap-1.5 outline-none">
        <button
          type="button"
          disabled={!authReady || !paymentsOn}
          onClick={signIn}
          className={`${VIP_PRIMARY_BTN} h-12 px-8 text-[12px] whitespace-nowrap`}
        >
          {label}
        </button>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {paymentsOn ? "Sign in to subscribe." : "Checkout opens soon."}
        </span>
      </div>
    );
  }

  // Subscribe stays off until the platform enables payments for this capper
  // (payments_enabled), so no checkout call is ever made while dark.
  return (
    <div id="subscribe" ref={blockRef} tabIndex={-1} className="flex flex-col items-start gap-3 sm:max-w-[420px] outline-none">
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
        disabled={!agreed || pending || !paymentsOn}
        onClick={subscribe}
        className={`${VIP_PRIMARY_BTN} h-12 px-8 text-[12px] whitespace-nowrap`}
      >
        {label}
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
