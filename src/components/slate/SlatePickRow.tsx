import Link from "next/link";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { PaidProgramPill } from "@/components/leaderboard/PaidProgramPill";
import { ModelTag } from "@/components/leaderboard/ModelTag";
import { XIcon } from "@/components/icons/XIcon";
import { formatHandle } from "@/lib/formatters";
import { formatBetDescriptor } from "@/lib/markets";
import type { SlatePick } from "@/lib/types";

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

export function SlatePickRow({ pick }: { pick: SlatePick }) {
  const isModel = pick.handle === "fadeai_";
  const isParlayLeg = pick.kind === "parlay_leg" && (pick.leg_count ?? 0) > 1;
  const posted = formatPostedAt(pick.posted_at);

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors">
      <Link
        href={pick.handle ? `/cappers/${pick.handle}` : "#"}
        className="shrink-0"
        aria-label={`View ${pick.handle ?? "capper"} profile`}
      >
        <CapperAvatar url={pick.profile_image_url} handle={pick.handle} size={32} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            href={pick.handle ? `/cappers/${pick.handle}` : "#"}
            className="font-bold text-[13px] truncate hover:text-[var(--color-text)] text-[var(--color-text)]"
          >
            {pick.display_name ?? pick.handle}
          </Link>
          {isModel && <ModelTag />}
          {pick.has_paid_program && <PaidProgramPill />}
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] font-medium truncate">
          {pick.handle ? formatHandle(pick.handle) : ""}
          {posted && <span className="ml-1.5 opacity-70">· {posted}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[12px] font-semibold text-[var(--color-text)] tabular-nums">
          {formatBetDescriptor({
            kind: isParlayLeg ? "parlay" : "straight",
            leg_count: pick.leg_count,
            market: pick.market,
            selection: pick.selection,
            line: pick.line,
            odds_taken: pick.odds_taken,
          })}
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)] font-medium tabular-nums mt-0.5">
          {formatStakeUnits(pick.stake_units)}
          {isParlayLeg && (
            <span className="ml-1.5 text-[var(--color-gold)] opacity-80">
              · in {pick.leg_count}-leg parlay
            </span>
          )}
        </div>
      </div>
      {pick.tweet_url && (
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
      )}
    </div>
  );
}
