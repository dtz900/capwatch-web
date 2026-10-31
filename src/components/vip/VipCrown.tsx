"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getVipCapperStatus } from "@/lib/vip/client";

/** The TailSlips brand crown in VIP purple, fading top to bottom like the
 *  green logo crown (orchid to violet; public/vip-crown-purple.png is the same
 *  fill for share cards). Uses logo-crown-bold.png, a stroke-thickened copy of
 *  logo-crown.png (alpha dilated ~15px at source size) so it reads at 20-28px;
 *  tinted through a CSS mask. `bold` is kept for call-site compatibility. */
export const VIP_CROWN_GRADIENT = "linear-gradient(180deg, #f5d0fe 0%, #8b7cf6 100%)";
export function VipCrown({
  className = "w-5 h-5",
  label,
}: {
  className?: string;
  label?: string;
  bold?: boolean;
}) {
  const mask: React.CSSProperties = {
    backgroundImage: VIP_CROWN_GRADIENT,
    WebkitMaskImage: "url(/logo-crown-bold.png)",
    maskImage: "url(/logo-crown-bold.png)",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
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
  const [show, setShow] = useState(false);
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
