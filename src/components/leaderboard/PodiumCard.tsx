import Link from "next/link";
import { CapperAvatar } from "./CapperAvatar";
import { RecentPicks } from "./RecentPicks";
import { BiggestWin } from "./BiggestWin";
import { PaidProgramPill } from "./PaidProgramPill";
import { DeletedPicksPill } from "./DeletedPicksPill";
import { LivePicksIndicator } from "./LivePicksIndicator";
import Image from "next/image";
import { XIcon } from "@/components/icons/XIcon";
import { formatUnits, formatRoi, formatWinRate, formatHandle } from "@/lib/formatters";
import { normalizeBreakdown } from "@/lib/markets";
import type { CapperRow, LastPick } from "@/lib/types";

type Variant = "gold" | "silver" | "bronze";

interface Props {
  rank: 1 | 2 | 3;
  variant: Variant;
  capper: CapperRow;
}

const RANK_LABEL: Record<1 | 2 | 3, string> = { 1: "Leader", 2: "2nd", 3: "3rd" };

interface Accent {
  bar: string;          // top-stripe gradient
  shadow: string;       // outer glow + hairline
  pillBg: string;       // rank pill colors
  avatarRing: string;
  watermarkColor: string;
}

const ACCENT: Record<Variant, Accent> = {
  gold: {
    bar: "bg-gradient-to-r from-[#f5c54a] via-[#fde18b] to-[#f5c54a]",
    shadow:
      "shadow-[0_0_0_1px_rgba(245,197,74,0.20),0_30px_80px_-20px_rgba(245,197,74,0.30)]",
    pillBg: "bg-[rgba(245,197,74,0.10)] text-[#f5c54a] border-[rgba(245,197,74,0.30)]",
    avatarRing: "ring-2 ring-[rgba(245,197,74,0.6)] ring-offset-2 ring-offset-[#0c0c10]",
    watermarkColor: "text-[#f5c54a]",
  },
  silver: {
    bar: "bg-gradient-to-r from-[#a1a1aa] via-[#d4d4d8] to-[#a1a1aa]",
    shadow:
      "shadow-[0_0_0_1px_rgba(212,212,216,0.10),0_20px_60px_-30px_rgba(212,212,216,0.18)]",
    pillBg: "bg-[rgba(212,212,216,0.06)] text-[#d4d4d8] border-[rgba(212,212,216,0.18)]",
    avatarRing: "",
    watermarkColor: "text-[#d4d4d8]",
  },
  bronze: {
    bar: "bg-gradient-to-r from-[#8b5a32] via-[#c8814a] to-[#8b5a32]",
    shadow:
      "shadow-[0_0_0_1px_rgba(200,129,74,0.10),0_20px_60px_-30px_rgba(200,129,74,0.18)]",
    pillBg: "bg-[rgba(200,129,74,0.06)] text-[#c8814a] border-[rgba(200,129,74,0.20)]",
    avatarRing: "",
    watermarkColor: "text-[#c8814a]",
  },
};

export function PodiumCard({ rank, variant, capper }: Props) {
  const isModel = capper.handle === "fadeai_";
  const isGold = variant === "gold";
  const accent = ACCENT[variant];

  const heroPositive = capper.units_profit >= 0;
  const heroSize = isGold ? "text-[44px]" : "text-[32px]";
  const padding = isGold ? "pt-7 px-7 pb-7" : "pt-6 px-5 pb-5";
  const nameSize = isGold ? "text-[22px]" : "text-[17px]";
  const avatarSize = isGold ? 56 : 44;

  const tagline = identityTagline(capper);

  return (
    <div
      className={`relative h-full flex flex-col rounded-2xl overflow-hidden
                  bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d]
                  ${accent.shadow} ${padding}`}
    >
      {/* Top accent stripe */}
      <div className={`absolute inset-x-0 top-0 h-[2px] ${accent.bar}`} />

      {/* Branded watermark — large rank numeral bleeding off the right */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-6 -top-2 select-none
                    font-black leading-none tracking-[-0.06em]
                    ${isGold ? "text-[240px]" : "text-[200px]"}
                    ${accent.watermarkColor} opacity-[0.045]`}
      >
        {rank}
      </span>

      {/* TailSlips crown watermark, faint, bottom-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 right-4 opacity-[0.12] grayscale"
      >
        <Image src="/logo-favicon.png" alt="" width={32} height={32} className="w-8 h-8" />
      </div>

      {/* Header: rank pill + X link */}
      <div className="relative flex items-center justify-between mb-5">
        <div
          className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border
                      text-[10px] font-extrabold uppercase tracking-[0.18em] ${accent.pillBg}`}
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
                     rounded-lg text-[var(--color-text-soft)] hover:text-white
                     hover:bg-[rgba(255,255,255,0.10)] transition-colors"
        >
          <XIcon size={13} glow />
        </a>
      </div>

      {/* Avatar + name + status pills */}
      {capper.handle ? (
        <Link
          href={`/cappers/${capper.handle}`}
          className="relative inline-flex items-center gap-3.5 mb-3 max-w-full hover:opacity-95 transition-opacity"
        >
          <CapperAvatar
            url={capper.profile_image_url}
            handle={capper.handle}
            size={avatarSize}
            className={accent.avatarRing}
            apiIntegrated={isModel}
          />
          <div className="flex-1 min-w-0">
            <div className={`font-extrabold leading-[1.1] mb-1 flex items-center gap-2 flex-wrap tracking-[-0.02em] ${nameSize}`}>
              {capper.display_name ?? capper.handle}
              {capper.has_paid_program && <PaidProgramPill />}
              <DeletedPicksPill count={capper.deleted_picks_count ?? 0} handle={capper.handle ?? undefined} />
            </div>
            <div className="text-[var(--color-text-muted)] text-sm font-medium">
              {formatHandle(capper.handle)}
            </div>
          </div>
        </Link>
      ) : (
        <div className="relative flex items-center gap-3.5 mb-3">
          <CapperAvatar
            url={capper.profile_image_url}
            handle={capper.handle}
            size={avatarSize}
            className={accent.avatarRing}
            apiIntegrated={isModel}
          />
          <div className="flex-1 min-w-0">
            <div className={`font-extrabold leading-[1.1] mb-1 flex items-center gap-2 flex-wrap tracking-[-0.02em] ${nameSize}`}>
              {capper.display_name ?? capper.handle}
              {capper.has_paid_program && <PaidProgramPill />}
              <DeletedPicksPill count={capper.deleted_picks_count ?? 0} handle={capper.handle ?? undefined} />
            </div>
          </div>
        </div>
      )}

      {/* Live signal: pulsing dot + count, sits below the handle so it reads
          as live status text rather than a label/pill. The indicator hides
          itself when count is 0, so the wrapper div renders unconditionally
          (lets a 0->N transition between SSR and the next client poll show). */}
      <div className="relative -mt-1 mb-3 empty:hidden">
        <LivePicksIndicator capperId={capper.capper_id} initialCount={capper.live_picks_count} />
      </div>

      {/* Identity tagline */}
      {tagline && (
        <div className="relative text-[11px] text-[var(--color-text-soft)] font-semibold mb-4 italic">
          {tagline}
        </div>
      )}

      {/* Hero stat + supporting line */}
      <div className="relative border-y border-[var(--color-border)] py-4 mb-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-2">
          Net profit
        </div>
        <div
          className={`font-extrabold tabular-nums leading-none tracking-[-0.03em] ${heroSize}
                      ${heroPositive ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}
        >
          {formatUnits(capper.units_profit)}
        </div>
        <div className="text-[12px] font-semibold mt-3 flex items-center gap-2 flex-wrap">
          <span className={capper.roi_pct >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}>
            {formatRoi(capper.roi_pct)} ROI
          </span>
          <span className="opacity-30">·</span>
          <span className="text-[var(--color-text-soft)]">{formatWinRate(capper.win_rate)} win</span>
          <span className="opacity-30">·</span>
          <span className="text-[var(--color-text-soft)]">{capper.picks_count} picks</span>
        </div>
      </div>

      {/* Momentum strip */}
      <MomentumStrip picks={capper.last_picks} />

      {/* Last picks list */}
      {capper.last_picks.length > 0 && (
        <div className="relative flex flex-col gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold">
            Recent picks
          </span>
          <RecentPicks picks={capper.last_picks} limit={isGold ? 5 : 4} />
        </div>
      )}

      {/* Biggest win + meta */}
      <div className="relative mt-auto pt-3 flex flex-col gap-2.5">
        <BiggestWin win={capper.biggest_win} accent={variant} />
        <div className="text-[10px] text-[var(--color-text-muted)] font-medium flex flex-wrap gap-x-2 gap-y-1">
          {capper.tracked_since && <span>Tracked since {formatMonth(capper.tracked_since)}</span>}
          {capper.tracked_since && capper.follower_count != null && <span className="opacity-30">·</span>}
          {capper.follower_count != null && <span>{formatFollowers(capper.follower_count)} followers</span>}
        </div>
      </div>
    </div>
  );
}

function MomentumStrip({ picks }: { picks: LastPick[] }) {
  if (!picks?.length) return null;
  const segments = [...picks].reverse();
  return (
    <div className="relative flex flex-col gap-1.5 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold">
          Momentum
        </span>
        <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] opacity-60">
          oldest → newest
        </span>
      </div>
      <div className="flex gap-[3px] h-[6px]">
        {segments.map((p, i) => {
          const color =
            p.outcome === "W" ? "bg-[var(--color-pos)]" :
            p.outcome === "L" ? "bg-[var(--color-neg)]" :
                                "bg-[rgba(255,255,255,0.10)]";
          return <span key={i} className={`flex-1 ${color} rounded-full`} title={p.outcome} />;
        })}
      </div>
    </div>
  );
}

function identityTagline(capper: CapperRow): string | null {
  const parlayPct = Math.round((capper.parlay_share ?? 0) * 100);
  if (parlayPct >= 50) return `Parlay specialist · ${parlayPct}% parlays`;

  const normalized = normalizeBreakdown(capper.bet_type_breakdown ?? {});
  const sorted = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] >= 0.5) {
    const [market, share] = sorted[0];
    return `${market} grinder · ${Math.round(share * 100)}%`;
  }
  if (sorted.length > 0) {
    return `Mixed action · top market ${sorted[0][0]}`;
  }
  return null;
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
