import "./vip-glow.css";
import Link from "next/link";
import type React from "react";
import type { ReactNode } from "react";
import { VIP_RULE_LINE, formatPrice } from "./format";
import { VIP_GLASS, VIP_GLASS_SHEEN } from "./styles";
import { VipCrown } from "./VipCrown";

/** The one VIP surface: dark purple glass with a top-left sheen. Children
 *  lay out on top of it; the card clips the sheen. */
export function VipGlassCard({
  children,
  className = "",
  glow = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  /** Overrides, e.g. a page-specific background. */
  style?: React.CSSProperties;
  /** Glow wave across the whole card. */
  glow?: boolean;
}) {
  return (
    <div className={`${VIP_GLASS} ${className}`} style={style}>
      <div aria-hidden="true" className={VIP_GLASS_SHEEN} />
      {glow && <div aria-hidden="true" className="vip-glow-wave" />}
      <div className="relative">{children}</div>
    </div>
  );
}

/** Header row on the glass: VIP wordmark over the headline, an optional
 *  one-line rule, and an optional right slot (price + button). No fill of
 *  its own; it sits on the VipGlassCard. */
export function VipBand({
  headline,
  right = null,
  compact = false,
  showRule = true,
  exclusivity = null,
  showInfo = true,
}: {
  headline: string;
  right?: ReactNode;
  compact?: boolean;
  showRule?: boolean;
  /** "1 of 1 eligible NBA cappers"; replaces the rule line when set. */
  exclusivity?: string | null;
  /** "What is this?" link to /vip-rules. */
  showInfo?: boolean;
}) {
  return (
    <div
      className={`${compact ? "px-4 py-3" : "px-5 py-3.5 sm:px-6"} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}
    >
      <div className="min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <VipCrown className={compact ? "w-5 h-5" : "w-6 h-6"} bold />
          <h2
            className={`${compact ? "text-[16px] sm:text-[17px]" : "text-[18px] sm:text-[20px]"} font-extrabold leading-tight tracking-[-0.01em] text-[var(--color-text)]`}
          >
            {headline}
          </h2>
          {headline === "VIP Eligible" && (
            <svg
              role="img"
              aria-label="Eligible"
              viewBox="0 0 20 20"
              className={`${compact ? "w-4 h-4" : "w-5 h-5"} shrink-0`}
            >
              <circle cx="10" cy="10" r="10" fill="var(--color-vip)" />
              <path
                d="M5.8 10.4l2.7 2.7 5.7-5.9"
                fill="none"
                stroke="var(--color-text)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        {(exclusivity || showRule || showInfo) && (
          <p className="text-[12px] leading-snug">
            {exclusivity ? (
              <span
                className="font-semibold text-[var(--color-vip-text)]"
                title={VIP_RULE_LINE}
              >
                {exclusivity}
              </span>
            ) : (
              showRule && (
                <span className="text-[var(--color-text-muted)]">
                  {VIP_RULE_LINE}
                </span>
              )
            )}
            {showInfo && (
              <>
                {(exclusivity || showRule) && (
                  <span
                    aria-hidden="true"
                    className="mx-2 text-[var(--color-text-muted)]"
                  >
                    ·
                  </span>
                )}
                <Link
                  href="/vip-rules"
                  className="text-[var(--color-text-muted)] underline decoration-[rgba(196,181,253,0.4)] underline-offset-[3px] hover:text-[var(--color-vip-text)] hover:decoration-[var(--color-vip-text)] transition-colors"
                >
                  What is this?
                </Link>
              </>
            )}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/** "$25" big with a small "/mo". */
export function VipPrice({ cents }: { cents: number }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 text-[var(--color-text)]">
      <span className="text-[28px] font-extrabold leading-none tabular-nums tracking-[-0.02em]">
        ${formatPrice(cents)}
      </span>
      <span className="text-[12px] font-bold text-[var(--color-text-muted)]">
        /mo
      </span>
    </span>
  );
}
