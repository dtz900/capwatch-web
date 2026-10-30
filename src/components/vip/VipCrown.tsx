"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getVipCapperStatus } from "@/lib/vip/client";

/** The TailSlips brand crown in light purple. Uses logo-crown-bold.png, a
 *  stroke-thickened copy of logo-crown.png (alpha dilated ~15px at source
 *  size) so it reads at 20-28px; tinted through a CSS mask. `bold` is kept
 *  for call-site compatibility. */
export function VipCrown({
  className = "w-5 h-5",
  label,
}: {
  className?: string;
  label?: string;
  bold?: boolean;
}) {
  const mask: React.CSSProperties = {
    backgroundColor: "var(--color-vip-text)",
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

/** Crown beside a capper's name when they are eligible to sell VIP in any
 *  sport. Renders nothing until the status lands or on any failure. */
export function VipNameCrown({ capperId }: { capperId: number }) {
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
  return show ? <VipCrown className="w-6 h-6 sm:w-7 sm:h-7" label="VIP capper" bold /> : null;
}
