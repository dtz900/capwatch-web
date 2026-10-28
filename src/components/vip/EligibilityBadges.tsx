"use client";

import type { VipEligibility } from "@/lib/vip/types";
import { closedCopy, eligibleCopy, eligibilityDetail, focalUnits } from "./format";
import { CHIP_MUTED, CHIP_VIP, INNER_CARD } from "./styles";

export const ELIGIBILITY_TOOLTIP =
  "Eligibility is recomputed nightly from the same record shown on this page.";

function focalTone(units: number | null): string {
  if (units == null) return "text-[var(--color-text-muted)]";
  if (units > 0) return "text-[var(--color-pos)]";
  if (units < 0) return "text-[var(--color-neg)]";
  return "text-[var(--color-text)]";
}

/** One sport: label + state chip, big signed units, muted sub-lines. The
 *  spec's sentence lives on as the card's aria-label. */
export function EligibilityCard({ row }: { row: VipEligibility }) {
  const label = row.eligible ? eligibleCopy(row) : closedCopy(row);
  const lines = eligibilityDetail(row);
  return (
    <div
      role="group"
      aria-label={label}
      className={`${INNER_CARD} flex flex-col gap-2.5 min-w-0 ${row.eligible ? "border-t-2 border-t-[var(--color-vip)]" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-soft)]">
          {row.sport}
        </span>
        <span className={row.eligible ? CHIP_VIP : CHIP_MUTED}>{row.eligible ? "Selling" : "Off"}</span>
      </div>
      <div
        className={`text-[28px] sm:text-[32px] leading-none font-extrabold tabular-nums tracking-[-0.02em] ${focalTone(row.units)}`}
      >
        {focalUnits(row.units)}
      </div>
      <div className="flex flex-col gap-0.5">
        {lines.map((l) => (
          <div key={l} className="text-[11px] text-[var(--color-text-muted)] font-medium">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Per-sport eligibility cards side by side. */
export function EligibilityBadges({ eligibility }: { eligibility: VipEligibility[] }) {
  if (eligibility.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {eligibility.map((row) => (
        <EligibilityCard key={row.sport} row={row} />
      ))}
    </div>
  );
}
