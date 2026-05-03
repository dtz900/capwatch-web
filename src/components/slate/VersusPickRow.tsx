import Link from "next/link";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { XIcon } from "@/components/icons/XIcon";
import { SignalsIcon } from "@/components/icons/SignalsIcon";
import { formatPickText } from "@/lib/bet-format";
import type { SlatePick } from "@/lib/types";

const FADEAI_SIGNALS_URL = "https://app.fadeai.bet/signals";

function formatStakeUnits(u: number): string {
  if (u >= 1) return `${u.toFixed(u % 1 === 0 ? 0 : 1)}u`;
  return `${u.toFixed(2)}u`;
}

interface Props {
  pick: SlatePick;
  awayTeam?: string | null;
  homeTeam?: string | null;
}

export function VersusPickRow({ pick, awayTeam, homeTeam }: Props) {
  const isModel = pick.handle === "fadeai_";
  const isHeavy = pick.stake_units >= 2;
  const isParlayLeg = pick.kind === "parlay_leg" && (pick.leg_count ?? 0) > 1;
  const handleStr = pick.handle ? `@${pick.handle}` : "";
  const rankStr = pick.capper_rank != null && pick.capper_rank <= 99 ? `#${pick.capper_rank}` : null;
  const betText = formatPickText({ pick, awayTeam, homeTeam });

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0 py-2 text-[12px] items-start">
      <Link
        href={pick.handle ? `/cappers/${pick.handle}` : "#"}
        className="shrink-0 row-span-2 self-start mt-0.5"
        aria-label={`View ${pick.handle ?? "capper"} profile`}
      >
        <CapperAvatar url={pick.profile_image_url} handle={pick.handle} size={20} apiIntegrated={isModel} />
      </Link>

      {/* Top line: rank, handle, action icon */}
      <div className="flex items-center gap-1.5 min-w-0">
        {rankStr && (
          <span className="text-[10px] font-bold tabular-nums text-[var(--color-text-muted)]">
            {rankStr}
          </span>
        )}
        <Link
          href={pick.handle ? `/cappers/${pick.handle}` : "#"}
          className="font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text)] truncate"
        >
          {handleStr}
        </Link>
        <div className="ml-auto shrink-0">
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

      {/* Bottom line: bet text + units */}
      <div className="flex items-baseline justify-between gap-2 mt-0.5">
        <span className={`tabular-nums truncate ${isHeavy ? "font-extrabold text-[var(--color-text)]" : "font-semibold text-[var(--color-text)]"}`}>
          {betText}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums">
          <span className={isHeavy ? "text-[var(--color-gold)] font-extrabold" : "text-[var(--color-text-muted)] font-medium"}>
            {formatStakeUnits(pick.stake_units)}
          </span>
          {isParlayLeg && (
            <span className="ml-1 text-[10px] text-[var(--color-text-muted)] opacity-80">
              in {pick.leg_count}-leg
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
