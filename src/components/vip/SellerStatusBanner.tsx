"use client";

/* Seller status banner: what Stripe onboarding, a restriction, a stop or a
 * platform disable means for the capper, and the one action that moves it.
 * Also handles the return from Stripe (?vip=onboarded / ?vip=resume). */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getVipSellerAccount, startVipOnboarding, startVipSelling } from "@/lib/vip/client";
import { ERROR_TEXT, INNER_CARD, SECONDARY_BTN_SM } from "./styles";

const STRIPE_DASHBOARD = "https://dashboard.stripe.com";

function Row({ children, action, error }: { children: ReactNode; action?: ReactNode; error?: string | null }) {
  return (
    <div className={`${INNER_CARD} flex items-center gap-3 flex-wrap`}>
      <span className="text-[12px] text-[var(--color-text-soft)]">{children}</span>
      {action && <span className="ml-auto">{action}</span>}
      {error && (
        <span role="status" className={`${ERROR_TEXT} w-full`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function SellerStatusBanner({
  status,
  token,
  paymentsEnabled,
  onStatusChange,
}: {
  status: string;
  token: string | null;
  paymentsEnabled: boolean;
  /** Called with the new seller status after Stripe or the platform changed it. */
  onStatusChange: (status: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read at request time; the return handler below must run once per mount.
  const tokenRef = useRef(token);
  const changeRef = useRef(onStatusChange);
  const handled = useRef(false);
  useEffect(() => {
    tokenRef.current = token;
    changeRef.current = onStatusChange;
  }, [token, onStatusChange]);

  const goToStripe = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { url } = await startVipOnboarding(tokenRef.current);
      window.location.assign(url);
    } catch (err) {
      console.error("VIP onboarding link failed", err);
      setError("Could not open Stripe. Try again.");
      setPending(false);
    }
  };

  useEffect(() => {
    if (handled.current) return;
    const vip = new URLSearchParams(window.location.search).get("vip");
    if (vip === "onboarded") {
      handled.current = true;
      getVipSellerAccount(tokenRef.current)
        .then((a) => changeRef.current(a.status))
        .catch((err: unknown) => console.error("VIP account refresh failed", err));
    } else if (vip === "resume" && paymentsEnabled) {
      handled.current = true;
      startVipOnboarding(tokenRef.current)
        .then(({ url }) => window.location.assign(url))
        .catch((err: unknown) => {
          console.error("VIP onboarding resume failed", err);
          setError("Could not reopen Stripe. Try Continue setup.");
        });
    }
  }, [paymentsEnabled]);

  const restart = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const r = await startVipSelling(tokenRef.current);
      onStatusChange(r.status);
    } catch (err) {
      console.error("VIP start selling failed", err);
      setError("Could not start selling again. Try again.");
    } finally {
      setPending(false);
    }
  };

  if (status === "onboarding") {
    return (
      <Row
        error={error}
        action={
          paymentsEnabled && (
            <button type="button" className={SECONDARY_BTN_SM} disabled={pending} onClick={goToStripe}>
              Continue setup
            </button>
          )
        }
      >
        Finishing setup with Stripe. Your Subscribe button turns on when Stripe is done.
      </Row>
    );
  }
  if (status === "restricted") {
    return (
      <Row
        action={
          <a
            href={STRIPE_DASHBOARD}
            target="_blank"
            rel="noopener noreferrer"
            className={`${SECONDARY_BTN_SM} no-underline`}
          >
            Open Stripe
          </a>
        }
      >
        Stripe needs more information before you can take payments. Your subscribers are paused until it&apos;s sorted.
      </Row>
    );
  }
  if (status === "stopped") {
    return (
      <Row
        error={error}
        action={
          <button type="button" className={SECONDARY_BTN_SM} disabled={pending} onClick={restart}>
            Start selling again
          </button>
        }
      >
        You stopped selling. New subscriptions are closed; current subscribers keep access until their period ends.
      </Row>
    );
  }
  if (status === "disabled") {
    return <Row>VIP selling is turned off for your account. Contact support@tailslips.com.</Row>;
  }
  return null;
}
