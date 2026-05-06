import Link from "next/link";
import { CapperAvatar } from "./CapperAvatar";
import { PickTiles } from "./PickTiles";
import { StatusPill } from "./StatusPill";
import { PaidProgramPill } from "./PaidProgramPill";
import { DeletedPicksPill } from "./DeletedPicksPill";
import { LivePicksIndicator } from "./LivePicksIndicator";
import { XIcon } from "@/components/icons/XIcon";
import { formatUnits, formatRoi, formatWinRate, formatHandle } from "@/lib/formatters";
import { buildProfileHref } from "@/lib/profileHref";
import type { CapperRow, Window } from "@/lib/types";

interface Props { rank: number; capper: CapperRow; window?: Window }

const DESKTOP_COLS =
  "hidden sm:grid grid-cols-[40px_minmax(180px,1fr)_minmax(280px,1.6fr)_64px_64px_70px_80px_44px] items-center gap-3 px-[22px] py-3.5 border-b border-[rgba(255,255,255,0.03)] text-sm font-semibold last:border-0 hover:bg-[rgba(255,255,255,0.02)] relative";

const MOBILE_CARD =
  "sm:hidden block px-4 py-3.5 border-b border-[rgba(255,255,255,0.03)] last:border-0";

export function StandingsRow({ rank, capper, window }: Props) {
  const unitsCls = capper.units_profit >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  const roiCls   = capper.roi_pct      >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  const isModel = capper.handle === "fadeai_";
  const profileHref = capper.handle ? buildProfileHref(capper.handle, { window }) : null;

  const handleNode = (
    <>
      <CapperAvatar url={capper.profile_image_url} handle={capper.handle} size={32} apiIntegrated={isModel} />
      <div className="leading-[1.2] min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold truncate">{capper.display_name ?? capper.handle}</span>
          {capper.has_paid_program && <PaidProgramPill />}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] font-medium flex items-center gap-1.5 flex-wrap">
          {capper.handle ? formatHandle(capper.handle) : ""}
          {capper.activity_status !== "active" && <StatusPill status={capper.activity_status} />}
          <DeletedPicksPill count={capper.deleted_picks_count ?? 0} handle={capper.handle ?? undefined} />
          <LivePicksIndicator capperId={capper.capper_id} initialCount={capper.live_picks_count} />
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className={DESKTOP_COLS}>
        <div className="text-[var(--color-text-muted)] font-bold">{String(rank).padStart(2, "0")}</div>
        {profileHref ? (
          <Link
            href={profileHref}
            className="inline-flex items-center gap-3 min-w-0 max-w-full w-fit hover:[&_span:first-child]:text-[var(--color-text)] transition-colors"
          >
            {handleNode}
          </Link>
        ) : (
          <div className="flex items-center gap-3 min-w-0">{handleNode}</div>
        )}
        <div className="min-w-0 relative">
          <PickTiles picks={capper.last_picks} limit={4} />
        </div>
        <div className="text-right">{capper.picks_count}</div>
        <div className="text-right">{formatWinRate(capper.win_rate)}</div>
        <div className={`text-right ${unitsCls}`}>{formatUnits(capper.units_profit)}</div>
        <div className={`text-right ${roiCls}`}>{formatRoi(capper.roi_pct)}</div>
        <div className="text-right relative">
          <a aria-label="View on X" target="_blank" rel="noopener"
             href={capper.handle ? `https://x.com/${capper.handle}` : "#"}
             className="inline-flex w-7 h-7 rounded-md bg-[rgba(255,255,255,0.04)] items-center justify-center text-[var(--color-text-muted)]">
            <XIcon size={11} />
          </a>
        </div>
      </div>

      <div className={MOBILE_CARD}>
        {profileHref ? (
          <Link href={profileHref} className="block">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-[var(--color-text-muted)] font-bold text-sm w-7 shrink-0">{String(rank).padStart(2, "0")}</div>
              {handleNode}
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-[var(--color-text-muted)] font-bold text-sm w-7 shrink-0">{String(rank).padStart(2, "0")}</div>
            {handleNode}
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-bold">Picks</div>
            <div className="text-sm font-bold tabular-nums mt-0.5">{capper.picks_count}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-bold">Win</div>
            <div className="text-sm font-bold tabular-nums mt-0.5">{formatWinRate(capper.win_rate)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-bold">Units</div>
            <div className={`text-sm font-bold tabular-nums mt-0.5 ${unitsCls}`}>{formatUnits(capper.units_profit)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-bold">ROI</div>
            <div className={`text-sm font-bold tabular-nums mt-0.5 ${roiCls}`}>{formatRoi(capper.roi_pct)}</div>
          </div>
        </div>
      </div>
    </>
  );
}
