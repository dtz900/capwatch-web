import Link from "next/link";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { XIcon } from "@/components/icons/XIcon";
import { SignalsIcon } from "@/components/icons/SignalsIcon";
import { OutcomeBadge } from "./OutcomeBadge";
import { formatPickText } from "@/lib/bet-format";
import { sharpTier, ELITE_RING_SHADOW } from "@/lib/sharp-tier";
import type { SlatePick } from "@/lib/types";

const FADEAI_SIGNALS_URL = "https://app.fadeai.bet/signals";

function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null;
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h`;
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
  const handleStr = pick.handle ? `@${pick.handle}` : "";
  const rankStr = pick.capper_rank != null && pick.capper_rank <= 99 ? `#${pick.capper_rank}` : null;
  const tier = sharpTier(pick.capper_rank);

  const iconNode = isModel ? (
    <a
      href={FADEAI_SIGNALS_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View on FADE AI"
      title="View this signal on FADE AI"
      className="text-[#5eead4] opacity-50 hover:opacity-100 transition-opacity"
    >
      <SignalsIcon size={11} />
    </a>
  ) : pick.tweet_url ? (
    <a
      href={pick.tweet_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View original tweet"
      className="text-[var(--color-text-muted)] opacity-50 hover:opacity-100 hover:text-white transition-opacity"
    >
      <XIcon size={11} />
    </a>
  ) : null;

  return (
    <>
      <div className="hidden sm:grid group grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-x-3 gap-y-0 py-1.5 text-[13px]">
        <Link
          href={pick.handle ? `/cappers/${pick.handle}` : "#"}
          className="shrink-0 rounded-full"
          aria-label={`View ${pick.handle ?? "capper"} profile`}
          title={tier ? `Elite sharp · top ${pick.capper_rank} on the leaderboard` : undefined}
          style={tier ? { boxShadow: ELITE_RING_SHADOW } : undefined}
        >
          <CapperAvatar url={pick.profile_image_url} handle={pick.handle} size={26} apiIntegrated={isModel} />
        </Link>

        <div className="min-w-0 truncate text-[var(--color-text-soft)]">
          {rankStr && (
            <span
              className="text-[11px] font-extrabold tabular-nums mr-1.5"
              style={{ color: tier?.color ?? "var(--color-text-muted)" }}
            >
              {rankStr}
            </span>
          )}
          <Link
            href={pick.handle ? `/cappers/${pick.handle}` : "#"}
            className={`font-semibold ${tier ? "" : "text-[var(--color-text-soft)] hover:text-[var(--color-text)]"}`}
            style={tier ? { color: tier.color } : undefined}
          >
            {handleStr}
          </Link>
          {posted && (
            <span className="ml-2 text-[11px] text-[var(--color-text-muted)] tabular-nums">{posted}</span>
          )}
        </div>

        <div
          className={`shrink-0 text-right tabular-nums ${isHeavy ? "font-extrabold" : "font-semibold"} ${tier ? "" : "text-[var(--color-text)]"}`}
          style={tier ? { color: tier.color } : undefined}
        >
          {betText}
        </div>

        <div className="shrink-0 text-right flex items-center justify-end gap-1.5">
          {pick.outcome ? (
            <OutcomeBadge outcome={pick.outcome} profitUnits={pick.profit_units} />
          ) : (
            <span className={`text-[11px] tabular-nums ${isHeavy ? "text-[var(--color-gold)] font-extrabold" : "text-[var(--color-text-muted)] font-medium"}`}>
              {formatStakeUnits(pick.stake_units)}
            </span>
          )}
          {isParlayLeg && (
            <span className="text-[11px] text-[var(--color-text-muted)] opacity-80">
              in {pick.leg_count}-leg
            </span>
          )}
        </div>

        <div className="shrink-0 w-5 flex justify-end">{iconNode}</div>
      </div>

      <div className="sm:hidden grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 py-2 text-[12px] items-start">
        <Link
          href={pick.handle ? `/cappers/${pick.handle}` : "#"}
          className="shrink-0 row-span-2 self-start mt-0.5 rounded-full"
          aria-label={`View ${pick.handle ?? "capper"} profile`}
          style={tier ? { boxShadow: ELITE_RING_SHADOW } : undefined}
        >
          <CapperAvatar url={pick.profile_image_url} handle={pick.handle} size={26} apiIntegrated={isModel} />
        </Link>

        <div className="flex items-center gap-1.5 min-w-0">
          {rankStr && (
            <span
              className="text-[10px] font-extrabold tabular-nums"
              style={{ color: tier?.color ?? "var(--color-text-muted)" }}
            >
              {rankStr}
            </span>
          )}
          <Link
            href={pick.handle ? `/cappers/${pick.handle}` : "#"}
            className={`font-semibold truncate ${tier ? "" : "text-[var(--color-text-soft)] hover:text-[var(--color-text)]"}`}
            style={tier ? { color: tier.color } : undefined}
          >
            {handleStr}
          </Link>
          {posted && (
            <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">{posted}</span>
          )}
          <div className="ml-auto shrink-0">{iconNode}</div>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`tabular-nums truncate ${isHeavy ? "font-extrabold" : "font-semibold"} ${tier ? "" : "text-[var(--color-text)]"}`}
            style={tier ? { color: tier.color } : undefined}
          >
            {betText}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums flex items-center gap-1.5">
            {pick.outcome ? (
              <OutcomeBadge outcome={pick.outcome} profitUnits={pick.profit_units} />
            ) : (
              <span className={isHeavy ? "text-[var(--color-gold)] font-extrabold" : "text-[var(--color-text-muted)] font-medium"}>
                {formatStakeUnits(pick.stake_units)}
              </span>
            )}
            {isParlayLeg && (
              <span className="text-[10px] text-[var(--color-text-muted)] opacity-80">
                in {pick.leg_count}-leg
              </span>
            )}
          </span>
        </div>
      </div>
    </>
  );
}
