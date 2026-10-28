"use client";

import { Tooltip } from "@/components/common/Tooltip";
import type { VipEligibility } from "@/lib/vip/types";
import { closedCopy, eligibleCopy } from "./format";

export const ELIGIBILITY_TOOLTIP =
  "Eligibility is recomputed nightly from the same record shown on this page.";

const PILL =
  "inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-[0.01em]";
const ELIGIBLE_PILL = `${PILL} bg-[var(--color-gold-soft)] border-[var(--color-gold)] text-[var(--color-gold)]`;
const CLOSED_PILL = `${PILL} bg-[rgba(255,255,255,0.04)] border-[var(--color-border)] text-[var(--color-text-muted)]`;

export function EligibilityPill({ row }: { row: VipEligibility }) {
  return (
    <Tooltip content={ELIGIBILITY_TOOLTIP}>
      <span className={row.eligible ? ELIGIBLE_PILL : CLOSED_PILL}>
        {row.eligible ? eligibleCopy(row) : closedCopy(row)}
      </span>
    </Tooltip>
  );
}

export function EligibilityBadges({ eligibility }: { eligibility: VipEligibility[] }) {
  if (eligibility.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {eligibility.map((row) => (
        <EligibilityPill key={row.sport} row={row} />
      ))}
    </div>
  );
}
