import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { ModelTag } from "@/components/leaderboard/ModelTag";
import { PaidProgramPill } from "@/components/leaderboard/PaidProgramPill";
import { DeletedPicksPill } from "@/components/leaderboard/DeletedPicksPill";
import { XIcon } from "@/components/icons/XIcon";
import { formatHandle } from "@/lib/formatters";
import { normalizeBreakdown } from "@/lib/markets";
import type { CapperProfile, CapperAggregate } from "@/lib/types";

function formatMonth(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatFollowers(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function identityTagline(agg: CapperAggregate | undefined): string | null {
  if (!agg) return null;
  const parlayPct = Math.round((agg.parlay_share ?? 0) * 100);
  if (parlayPct >= 50) return `Parlay specialist · ${parlayPct}% parlays`;
  const normalized = normalizeBreakdown(agg.bet_type_breakdown ?? {});
  const sorted = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] >= 0.5) {
    const [market, share] = sorted[0];
    return `${market} grinder · ${Math.round(share * 100)}%`;
  }
  if (sorted.length > 0) return `Mixed action · top market ${sorted[0][0]}`;
  return null;
}

export function CapperHero({
  profile,
  windowAgg,
}: {
  profile: CapperProfile;
  windowAgg: CapperAggregate | undefined;
}) {
  const c = profile.capper;
  const isModel = c.handle === "fadeai_";
  const tagline = identityTagline(windowAgg);
  const trackedSince = formatMonth(windowAgg?.tracked_since ?? null);
  const followers = formatFollowers(c.follower_count);

  return (
    <header className="flex items-start gap-5 flex-wrap mb-6">
      <CapperAvatar url={c.profile_image_url} handle={c.handle} size={72} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">
            {c.display_name ?? c.handle}
          </h1>
          {isModel && <ModelTag />}
          {c.has_paid_program && <PaidProgramPill />}
          <DeletedPicksPill count={windowAgg?.deleted_picks_count ?? 0} />
        </div>
        <div className="text-[14px] text-[var(--color-text-muted)] font-semibold flex items-center gap-2 flex-wrap">
          {c.handle ? formatHandle(c.handle) : ""}
          {c.handle && (
            <a
              href={`https://x.com/${c.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on X"
              className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-[rgba(255,255,255,0.04)]
                         text-[var(--color-text-soft)] hover:text-white hover:bg-[rgba(255,255,255,0.10)] transition-colors"
            >
              <XIcon size={12} glow />
            </a>
          )}
        </div>
        {tagline && (
          <div className="text-[12px] italic text-[var(--color-text-soft)] font-semibold mt-2">
            {tagline}
          </div>
        )}
        <div className="text-[11px] text-[var(--color-text-muted)] font-medium mt-2 flex items-center gap-2 flex-wrap">
          {trackedSince && <span>Tracked since {trackedSince}</span>}
          {trackedSince && followers && <span className="opacity-30">·</span>}
          {followers && <span>{followers} followers</span>}
        </div>
      </div>
    </header>
  );
}
