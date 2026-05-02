import Link from "next/link";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { XIcon } from "@/components/icons/XIcon";
import { SignalsIcon } from "@/components/icons/SignalsIcon";
import type { SlatePick } from "@/lib/types";

const FADEAI_SIGNALS_URL = "https://app.fadeai.bet/signals";

function formatStakeUnits(u: number): string {
  if (u >= 1) return `${u.toFixed(u % 1 === 0 ? 0 : 1)}u`;
  return `${u.toFixed(2)}u`;
}

function formatOdds(odds: number | null): string {
  if (odds == null) return "";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function isF5(market: string | null): boolean {
  return (market ?? "").toLowerCase().startsWith("f5_");
}

/**
 * One row inside the AWAY/HOME versus columns. Team is implied by the column
 * the row sits in, so we drop the team label and show only the price and
 * stake.
 */
export function VersusPickRow({ pick }: { pick: SlatePick }) {
  const isModel = pick.handle === "fadeai_";
  const isHeavy = pick.stake_units >= 2;
  const isParlayLeg = pick.kind === "parlay_leg" && (pick.leg_count ?? 0) > 1;
  const handleStr = pick.handle ? `@${pick.handle}` : "";
  const rankStr = pick.capper_rank != null && pick.capper_rank <= 99 ? `#${pick.capper_rank}` : null;
  const odds = formatOdds(pick.odds_taken);
  const f5 = isF5(pick.market);

  return (
    <div className="flex items-center gap-2 py-1.5 text-[12px]">
      <Link
        href={pick.handle ? `/cappers/${pick.handle}` : "#"}
        className="shrink-0"
        aria-label={`View ${pick.handle ?? "capper"} profile`}
      >
        <CapperAvatar url={pick.profile_image_url} handle={pick.handle} size={18} apiIntegrated={isModel} />
      </Link>
      <div className="min-w-0 flex-1 truncate text-[var(--color-text-soft)]">
        {rankStr && (
          <span className="text-[10px] font-bold tabular-nums text-[var(--color-text-muted)] mr-1.5">
            {rankStr}
          </span>
        )}
        <Link
          href={pick.handle ? `/cappers/${pick.handle}` : "#"}
          className="font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
        >
          {handleStr}
        </Link>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        {f5 && (
          <span className="text-[9px] uppercase tracking-[0.10em] font-bold text-[var(--color-text-muted)] mr-1.5">
            F5
          </span>
        )}
        {odds && (
          <span className={`${isHeavy ? "font-extrabold text-[var(--color-text)]" : "font-semibold text-[var(--color-text)]"} mr-1.5`}>
            {odds}
          </span>
        )}
        <span className={isHeavy ? "text-[var(--color-gold)] font-extrabold" : "text-[var(--color-text-muted)] font-medium"}>
          {formatStakeUnits(pick.stake_units)}
        </span>
        {isParlayLeg && (
          <span className="ml-1.5 text-[10px] text-[var(--color-text-muted)] opacity-80">
            in {pick.leg_count}-leg
          </span>
        )}
      </div>
      <div className="shrink-0 w-4 flex justify-end">
        {isModel ? (
          <a
            href={FADEAI_SIGNALS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on FADE AI"
            className="text-[#5eead4] opacity-50 hover:opacity-100 transition-opacity"
          >
            <SignalsIcon size={10} />
          </a>
        ) : pick.tweet_url ? (
          <a
            href={pick.tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View original tweet"
            className="text-[var(--color-text-muted)] opacity-50 hover:opacity-100 hover:text-white transition-opacity"
          >
            <XIcon size={10} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
