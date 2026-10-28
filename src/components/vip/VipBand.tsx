import type { ReactNode } from "react";
import { VIP_RULE_LINE, formatPrice } from "./format";
import { VIP_BAND_BG, VIP_WORDMARK } from "./styles";

/** Royal purple header band: VIP wordmark, the headline, the rule, and an
 *  optional right slot (price + button). Flat, no glow; sits flush at the
 *  top of a rounded card (the card clips it). */
export function VipBand({
  headline,
  right = null,
  compact = false,
  showRule = true,
}: {
  headline: string;
  right?: ReactNode;
  compact?: boolean;
  showRule?: boolean;
}) {
  return (
    <div
      className={`${VIP_BAND_BG} ${compact ? "px-4 py-3" : "px-5 py-4"} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}
    >
      <div className="min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={VIP_WORDMARK}>VIP</span>
          <h2
            className={`${compact ? "text-[16px] sm:text-[18px]" : "text-[20px] sm:text-[24px]"} font-extrabold leading-tight text-[var(--color-text)]`}
          >
            {headline}
          </h2>
        </div>
        {showRule && (
          <p className="text-[12px] leading-snug text-[rgba(247,243,233,0.78)]">{VIP_RULE_LINE}</p>
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
      <span className="text-[28px] font-extrabold leading-none tabular-nums">${formatPrice(cents)}</span>
      <span className="text-[12px] font-bold text-[rgba(247,243,233,0.78)]">/mo</span>
    </span>
  );
}
