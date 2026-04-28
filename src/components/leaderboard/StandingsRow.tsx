import { CapperAvatar } from "./CapperAvatar";
import { FormDots } from "./FormDots";
import { StatusPill } from "./StatusPill";
import { PaidProgramPill } from "./PaidProgramPill";
import { XIcon } from "@/components/icons/XIcon";
import { formatUnits, formatRoi, formatWinRate, formatHandle } from "@/lib/formatters";
import type { CapperRow } from "@/lib/types";

interface Props { rank: number; capper: CapperRow }

const COLS =
  "grid grid-cols-[50px_1fr_120px_70px_70px_70px_80px_50px] items-center px-[22px] py-3.5 border-b border-[rgba(255,255,255,0.03)] text-sm font-semibold last:border-0 hover:bg-[rgba(255,255,255,0.02)]";

export function StandingsRow({ rank, capper }: Props) {
  const unitsCls = capper.units_profit >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  const roiCls   = capper.roi_pct      >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  return (
    <div className={COLS}>
      <div className="text-[var(--color-text-muted)] font-bold">{String(rank).padStart(2, "0")}</div>
      <div className="flex items-center gap-3">
        <CapperAvatar url={capper.profile_image_url} handle={capper.handle} size={32} />
        <div className="leading-[1.2]">
          <div className="font-bold">{capper.display_name ?? capper.handle}</div>
          <div className="text-xs text-[var(--color-text-muted)] font-medium flex items-center gap-1.5">
            {capper.handle ? formatHandle(capper.handle) : ""}
            {capper.activity_status !== "active" && <StatusPill status={capper.activity_status} />}
            {capper.has_paid_program && <PaidProgramPill />}
          </div>
        </div>
      </div>
      <div className="text-right"><FormDots outcomes={capper.last_10_outcomes} className="justify-end" /></div>
      <div className="text-right">{capper.picks_count}</div>
      <div className="text-right">{formatWinRate(capper.win_rate)}</div>
      <div className={`text-right ${unitsCls}`}>{formatUnits(capper.units_profit)}</div>
      <div className={`text-right ${roiCls}`}>{formatRoi(capper.roi_pct)}</div>
      <div className="text-right">
        <a aria-label="View on X" target="_blank" rel="noopener"
           href={capper.handle ? `https://x.com/${capper.handle}` : "#"}
           className="inline-flex w-7 h-7 rounded-md bg-[rgba(255,255,255,0.04)] items-center justify-center text-[var(--color-text-muted)]">
          <XIcon size={11} />
        </a>
      </div>
    </div>
  );
}
