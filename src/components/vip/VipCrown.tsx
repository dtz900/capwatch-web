"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getVipCapperStatus } from "@/lib/vip/client";
import { useVipInitialStatus } from "./VipInitialStatus";

/** The TailSlips brand crown in VIP purple: the green logo crown's exact
 *  shape (crown-gradient.png) with the same top-to-bottom fade, orchid to
 *  violet, baked into public/vip-crown-purple.png. The share cards draw the
 *  same file. `bold` is kept for call-site compatibility. */
export function VipCrown({
  className = "w-5 h-5",
  label,
}: {
  className?: string;
  label?: string;
  bold?: boolean;
}) {
  const mask: React.CSSProperties = {
    backgroundImage: "url(/vip-crown-purple.png)",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
  };
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
      className={`inline-block shrink-0 ${className}`}
      style={mask}
    />
  );
}

/** True once the status says the capper is eligible to sell VIP in any
 *  sport; false until it lands and on any failure. */
export function useVipEligible(capperId: number): boolean {
  const { session, authReady } = useAuth();
  const token = session?.access_token ?? null;
  // Eligibility is the same for every viewer, so the server's first-paint
  // status can show the ring and crown before the client call returns.
  const initial = useVipInitialStatus();
  const [show, setShow] = useState(() => !!initial?.eligibility.some((e) => e.eligible));
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    getVipCapperStatus(capperId, token)
      .then((s) => {
        if (!cancelled) setShow(s.eligibility.some((e) => e.eligible));
      })
      .catch(() => {
        if (!cancelled) setShow(false);
      });
    return () => {
      cancelled = true;
    };
    // Token changes for the same viewer do not change eligibility.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capperId, authReady]);
  return show;
}

/** Crown beside a capper's name when they are eligible to sell VIP. */
export function VipNameCrown() {
  return <VipCrown className="w-6 h-6 sm:w-7 sm:h-7" label="VIP capper" bold />;
}
