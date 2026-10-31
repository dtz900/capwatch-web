"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { openVipPortal } from "@/lib/vip/client";
import { ERROR_TEXT } from "./styles";

/** Opens the Stripe customer portal (update card, cancel). Always available
 *  to someone already paying, even while new checkouts are switched off. */
export function ManageSubscriptionLink({ capperId }: { capperId: number }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { url } = await openVipPortal(capperId, token);
      window.location.assign(url);
    } catch (err) {
      console.error("VIP billing portal failed", err);
      setError("Could not open billing. Try again.");
      setPending(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="text-[12px] font-bold text-[var(--color-vip-text)] underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
      >
        Manage subscription
      </button>
      {error && (
        <span role="status" className={ERROR_TEXT}>
          {error}
        </span>
      )}
    </span>
  );
}
