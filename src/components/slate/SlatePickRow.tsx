import Link from "next/link";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { PaidProgramPill } from "@/components/leaderboard/PaidProgramPill";
import { XIcon } from "@/components/icons/XIcon";
import { SignalsIcon } from "@/components/icons/SignalsIcon";
import { formatHandle } from "@/lib/formatters";
import { formatPickText } from "@/lib/bet-format";
import type { SlatePick } from "@/lib/types";

const FADEAI_SIGNALS_URL = "https://app.fadeai.bet/signals";

function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null;
  const posted = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - posted) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatStakeUnits(u: number): string {
  if (u >= 1) return `${u.toFixed(u % 1 === 0 ? 0 : 1)}u`;
  return `${u.toFixed(2)}u`;
}

interface Props {
  pick: SlatePick;
  awayTeam?: string | null;
  homeTeam?: string | null;
}

export function SlatePickRow({ pick, awayTeam, homeTeam }: Props) {
  const isModel = pick.handle === "fadeai_";
  const isParlayLeg = pick.kind === "parlay_leg" && (pick.leg_count ?? 0) > 1;
  const posted = formatPostedAt(pick.posted_at);
  const isHeavy = pick.stake_units >= 2;
  const betText = formatPickText({ pick, awayTeam, homeTeam });

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-[rgba(255,255,255,0.025)] transition-colors">
      {pick.capper_rank != null && pick.capper_rank <= 99 && (
        <div
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md
                     text-[10px] font-extrabold tabular-nums
                     bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)]"
          aria-label={`Leaderboard rank ${pick.capper_rank}`}
          title={`Leaderboard rank #${pick.capper_rank} (last 30d)`}
        >
          #{pick.capper_rank}
        </div>
      )}
      <Link
        href={pick.handle ? `/cappers/${pick.handle}` : "#"}
        className="shrink-0"
        aria-label={`View ${pick.handle ?? "capper"} profile`}
      >
        <CapperAvatar url={pick.profile_image_url} handle={pick.handle} size={32} apiIntegrated={isModel} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            href={pick.handle ? `/cappers/${pick.handle}` : "#"}
            className="font-bold text-[13px] truncate hover:text-[var(--color-text)] text-[var(--color-text)]"
          >
            {pick.display_name ?? pick.handle}
          </Link>
          {pick.has_paid_program && <PaidProgramPill />}
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] font-medium truncate">
          {pick.handle ? formatHandle(pick.handle) : ""}
          {posted && <span className="ml-1.5 opacity-70">· {posted}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`text-[12px] tabular-nums ${isHeavy ? "font-extrabold text-[var(--color-text)]" : "font-semibold text-[var(--color-text)]"}`}>
          {betText}
        </div>
        <div className="text-[10px] font-medium tabular-nums mt-0.5">
          <span className={isHeavy ? "text-[var(--color-gold)] font-extrabold" : "text-[var(--color-text-muted)]"}>
            {formatStakeUnits(pick.stake_units)}
          </span>
          {isParlayLeg && (
            <span className="ml-1.5 text-[var(--color-text-muted)] opacity-80">
              · in {pick.leg_count}-leg parlay
            </span>
          )}
        </div>
      </div>
      {isModel ? (
        <a
          href={FADEAI_SIGNALS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View FADE AI signals"
          title="View this signal on FADE AI"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-[rgba(94,234,212,0.10)]
                     text-[#5eead4] hover:bg-[rgba(94,234,212,0.20)] hover:text-white transition-colors"
        >
          <SignalsIcon size={11} glow />
        </a>
      ) : pick.tweet_url ? (
        <a
          href={pick.tweet_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View original tweet"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-[rgba(255,255,255,0.04)]
                     text-[var(--color-text-soft)] hover:text-white hover:bg-[rgba(255,255,255,0.10)] transition-colors"
        >
          <XIcon size={11} glow />
        </a>
      ) : null}
    </div>
  );
}
