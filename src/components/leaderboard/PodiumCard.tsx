import { CapperAvatar } from "./CapperAvatar";
import { FormDots } from "./FormDots";
import { SpecialtyPills } from "./SpecialtyPills";
import { BiggestWin } from "./BiggestWin";
import { MetaLine } from "./MetaLine";
import { MixBar } from "./MixBar";
import { ModelTag } from "./ModelTag";
import { XIcon } from "@/components/icons/XIcon";
import { formatUnits, formatRoi, formatWinRate, formatHandle } from "@/lib/formatters";
import type { CapperRow } from "@/lib/types";

type Variant = "gold" | "silver" | "bronze";

interface Props {
  rank: 1 | 2 | 3;
  variant: Variant;
  capper: CapperRow;
}

const RANK_LABEL = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" };

const CARD_STYLES: Record<Variant, string> = {
  gold:
    "border-[1.5px] border-[rgba(245,197,74,0.45)] " +
    "bg-[radial-gradient(ellipse_100%_70%_at_50%_0%,rgba(245,197,74,0.08),transparent_70%)] " +
    "shadow-[0_0_70px_-10px_rgba(245,197,74,0.20)] p-7",
  silver:
    "border border-[rgba(212,212,216,0.20)] " +
    "bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(212,212,216,0.06),transparent_70%)] " +
    "shadow-[0_0_50px_-20px_rgba(212,212,216,0.10)] p-5",
  bronze:
    "border border-[rgba(200,129,74,0.22)] " +
    "bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(200,129,74,0.06),transparent_70%)] " +
    "shadow-[0_0_50px_-20px_rgba(200,129,74,0.10)] p-5",
};

const ACCENT_TEXT: Record<Variant, string> = {
  gold:   "text-[var(--color-gold)]",
  silver: "text-[var(--color-silver)]",
  bronze: "text-[var(--color-bronze)]",
};

export function PodiumCard({ rank, variant, capper }: Props) {
  const isModel = capper.handle === "fadeai_";
  const avatarSize = variant === "gold" ? 60 : 48;
  const nameSize = variant === "gold" ? "text-[22px]" : "text-[17px]";
  const statSize = variant === "gold" ? "text-[22px]" : "text-[18px]";

  return (
    <div className={`bg-[var(--color-bg-card)] rounded-2xl relative ${CARD_STYLES[variant]}`}>
      <div className={`inline-flex items-center gap-2 text-[11px] font-extrabold
                       uppercase tracking-[0.14em] mb-4 ${ACCENT_TEXT[variant]}`}>
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current inline-block" />
        <span className="text-[13px]">0{rank}</span> · {RANK_LABEL[rank]}
      </div>

      <div className="flex items-center gap-3.5 mb-4">
        <CapperAvatar url={capper.profile_image_url} handle={capper.handle} size={avatarSize}
                      className={variant === "gold" ? "border-[1.5px] border-[rgba(245,197,74,0.55)]" : ""} />
        <div className="flex-1 min-w-0">
          <div className={`font-bold leading-[1.2] mb-0.5 flex items-center gap-2 flex-wrap ${nameSize}`}>
            {capper.display_name ?? capper.handle}
            {isModel && <ModelTag />}
          </div>
          <div className="text-[var(--color-text-muted)] text-sm font-medium">
            {capper.handle ? formatHandle(capper.handle) : ""}
          </div>
        </div>
        <a aria-label="View on X" target="_blank" rel="noopener"
           href={capper.handle ? `https://x.com/${capper.handle}` : "#"}
           className="w-8 h-8 flex items-center justify-center bg-[rgba(255,255,255,0.04)]
                      rounded-lg text-[var(--color-text-muted)]">
          <XIcon size={13} />
        </a>
      </div>

      <div className={`grid grid-cols-4 border-y border-[var(--color-border)] mb-4
                       ${variant === "gold" ? "py-[18px]" : "py-3.5"}`}>
        <Stat label="Picks" value={String(capper.picks_count)} size={statSize} />
        <Stat label="Win %" value={formatWinRate(capper.win_rate).replace("%", "")} size={statSize} />
        <Stat label="Units" value={formatUnits(capper.units_profit)} size={statSize} positive={capper.units_profit >= 0} />
        <Stat label="ROI"   value={formatRoi(capper.roi_pct)}        size={statSize} positive={capper.roi_pct >= 0} />
      </div>

      <div className="flex flex-col gap-3">
        <DetailRow label="Mix">
          <MixBar parlayShare={capper.parlay_share ?? 0} />
        </DetailRow>
        {Object.keys(capper.bet_type_breakdown).length > 0 && (
          <DetailRow label="Specialty">
            <SpecialtyPills breakdown={capper.bet_type_breakdown} />
          </DetailRow>
        )}
        {capper.last_10_outcomes.length > 0 && (
          <DetailRow label="Last 10">
            <FormDots outcomes={capper.last_10_outcomes} />
          </DetailRow>
        )}
        <BiggestWin win={capper.biggest_win} />
        <MetaLine
          followerCount={capper.follower_count}
          trackedSince={capper.tracked_since}
          tweetsParsed={capper.tweets_parsed}
          tagline={isModel ? "LightGBM hybrid · same parser, same grader as every other entry" : undefined}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, size, positive }:
  { label: string; value: string; size: string; positive?: boolean }) {
  const colorCls =
    positive === undefined ? "text-[var(--color-text)]" :
    positive ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  return (
    <div className="border-l border-[var(--color-border)] first:border-l-0 first:pl-0 pl-3">
      <div className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] mb-1.5 font-bold">
        {label}
      </div>
      <div className={`font-extrabold leading-none ${size} ${colorCls}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2.5">
      <span className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold">
        {label}
      </span>
      {children}
    </div>
  );
}
