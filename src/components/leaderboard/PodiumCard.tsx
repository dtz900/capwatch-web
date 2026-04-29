import { CapperAvatar } from "./CapperAvatar";
import { FormDots } from "./FormDots";
import { SpecialtyPills } from "./SpecialtyPills";
import { BiggestWin } from "./BiggestWin";
import { MetaLine } from "./MetaLine";
import { MixBar } from "./MixBar";
import { ModelTag } from "./ModelTag";
import { PaidProgramPill } from "./PaidProgramPill";
import { DeletedPicksPill } from "./DeletedPicksPill";
import { XIcon } from "@/components/icons/XIcon";
import { formatUnits, formatRoi, formatWinRate, formatHandle } from "@/lib/formatters";
import type { CapperRow } from "@/lib/types";

type Variant = "gold" | "silver" | "bronze";

interface Props {
  rank: 1 | 2 | 3;
  variant: Variant;
  capper: CapperRow;
}

const RANK_LABEL = { 1: "Champion", 2: "Runner-up", 3: "Third" };

const ACCENT: Record<Variant, { bar: string; ring: string; glow: string; num: string; pillBg: string }> = {
  gold: {
    bar: "from-[#f5c54a] via-[#fde18b] to-[#f5c54a]",
    ring: "border-[#f5c54a]",
    glow: "shadow-[0_30px_80px_-20px_rgba(245,197,74,0.35),inset_0_1px_0_0_rgba(245,197,74,0.25)]",
    num: "text-[#f5c54a]",
    pillBg: "bg-[rgba(245,197,74,0.10)] text-[#f5c54a] border-[rgba(245,197,74,0.30)]",
  },
  silver: {
    bar: "from-[#a1a1aa] via-[#d4d4d8] to-[#a1a1aa]",
    ring: "border-[rgba(212,212,216,0.25)]",
    glow: "shadow-[0_20px_60px_-30px_rgba(212,212,216,0.15)]",
    num: "text-[#d4d4d8]",
    pillBg: "bg-[rgba(212,212,216,0.06)] text-[#d4d4d8] border-[rgba(212,212,216,0.18)]",
  },
  bronze: {
    bar: "from-[#8b5a32] via-[#c8814a] to-[#8b5a32]",
    ring: "border-[rgba(200,129,74,0.25)]",
    glow: "shadow-[0_20px_60px_-30px_rgba(200,129,74,0.15)]",
    num: "text-[#c8814a]",
    pillBg: "bg-[rgba(200,129,74,0.06)] text-[#c8814a] border-[rgba(200,129,74,0.20)]",
  },
};

export function PodiumCard({ rank, variant, capper }: Props) {
  const isModel = capper.handle === "fadeai_";
  const isGold = variant === "gold";
  const accent = ACCENT[variant];

  const padding = isGold ? "pt-8 px-7 pb-7" : "pt-7 px-5 pb-5";
  const avatarSize = isGold ? 64 : 44;
  const nameSize = isGold ? "text-[26px]" : "text-[18px]";
  const statSize = isGold ? "text-[28px]" : "text-[20px]";
  const watermarkSize = isGold ? "text-[200px]" : "text-[160px]";

  return (
    <div
      className={`relative h-full flex flex-col overflow-hidden rounded-2xl
                  bg-[#101013] border-[1.5px] ${accent.ring} ${accent.glow} ${padding}`}
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${accent.bar}`} />

      <div
        className={`pointer-events-none absolute -right-6 -top-10 select-none
                    font-black leading-none ${watermarkSize} ${accent.num} opacity-[0.07]`}
      >
        {String(rank).padStart(2, "0")}
      </div>

      <div className="relative flex items-center justify-between mb-5">
        <div
          className={`inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em]
                      px-2.5 py-1 rounded-md border ${accent.pillBg}`}
        >
          <span>#{rank}</span>
          <span className="opacity-50">·</span>
          <span>{RANK_LABEL[rank]}</span>
        </div>
        <a
          aria-label="View on X"
          target="_blank"
          rel="noopener"
          href={capper.handle ? `https://x.com/${capper.handle}` : "#"}
          className="w-8 h-8 flex items-center justify-center bg-[rgba(255,255,255,0.04)]
                     rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <XIcon size={12} />
        </a>
      </div>

      <div className="relative flex items-center gap-4 mb-5">
        <CapperAvatar
          url={capper.profile_image_url}
          handle={capper.handle}
          size={avatarSize}
          className={isGold ? "ring-2 ring-[#f5c54a]/60 ring-offset-2 ring-offset-[#101013]" : ""}
        />
        <div className="flex-1 min-w-0">
          <div className={`font-extrabold leading-[1.1] mb-1 flex items-center gap-2 flex-wrap tracking-[-0.02em] ${nameSize}`}>
            {capper.display_name ?? capper.handle}
            {isModel && <ModelTag />}
            {capper.has_paid_program && <PaidProgramPill />}
            <DeletedPicksPill count={capper.deleted_picks_count ?? 0} />
          </div>
          <div className="text-[var(--color-text-muted)] text-sm font-medium">
            {capper.handle ? formatHandle(capper.handle) : ""}
          </div>
        </div>
      </div>

      <div
        className={`relative grid grid-cols-2 gap-x-2 gap-y-3 mb-5
                    border-t border-b border-[var(--color-border)]
                    ${isGold ? "py-5" : "py-4"}`}
      >
        <Stat label="ROI" value={formatRoi(capper.roi_pct)} size={statSize} positive={capper.roi_pct >= 0} hero />
        <Stat label="Units" value={formatUnits(capper.units_profit)} size={statSize} positive={capper.units_profit >= 0} hero />
        <Stat label="Win Rate" value={formatWinRate(capper.win_rate)} size={isGold ? "text-[18px]" : "text-[15px]"} />
        <Stat label="Picks" value={String(capper.picks_count)} size={isGold ? "text-[18px]" : "text-[15px]"} />
      </div>

      <div className="relative flex flex-col gap-3">
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
      </div>

      <div className="relative mt-auto pt-4 flex flex-col gap-3">
        <BiggestWin win={capper.biggest_win} />
        <MetaLine
          followerCount={capper.follower_count}
          trackedSince={capper.tracked_since}
          tagline={isModel ? "LightGBM hybrid · same parser, same grader as every other entry" : undefined}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, size, positive, hero }:
  { label: string; value: string; size: string; positive?: boolean; hero?: boolean }) {
  const colorCls =
    positive === undefined ? "text-[var(--color-text)]" :
    positive ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  return (
    <div className={hero ? "" : "opacity-90"}>
      <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-1.5 font-bold">
        {label}
      </div>
      <div className={`font-extrabold leading-none tracking-[-0.02em] tabular-nums ${size} ${colorCls}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold flex-shrink-0">
        {label}
      </span>
      <div className="min-w-0 flex-1 flex justify-end">
        {children}
      </div>
    </div>
  );
}
