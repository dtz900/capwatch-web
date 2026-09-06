import { LiveBadge } from "./LiveBadge";
import type { SportFilter } from "@/lib/types";

interface HeroProps {
  stats?: {
    totalPicks: number;
    cappersCount: number;
  };
  sport?: SportFilter;
}

const COPY: Record<SportFilter, { kicker: string; title: string; lead: string }> = {
  all: {
    kicker: "MLB + NFL · 2026",
    title: "Capper Rankings",
    lead: "Every public MLB and NFL pick from a tracked X account, graded against the final outcome.",
  },
  mlb: {
    kicker: "MLB · 2026 Season",
    title: "MLB Capper Rankings",
    lead: "Every public MLB pick from a tracked X account, graded against the final outcome.",
  },
  nfl: {
    kicker: "NFL · 2026 Season",
    title: "NFL Capper Rankings",
    lead: "Every public NFL pick from a tracked X account, graded against the final outcome.",
  },
};

export function Hero({ stats, sport = "all" }: HeroProps) {
  const copy = COPY[sport] ?? COPY.all;
  return (
    <header className="pt-8 pb-6 sm:pt-14 sm:pb-8">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em]
                      text-[var(--color-text-muted)] mb-3.5
                      flex items-center gap-2 flex-wrap">
        <span>{copy.kicker}</span>
        <span className="opacity-40">·</span>
        <LiveBadge />
        <span className="opacity-40">·</span>
        <span className="text-[var(--color-text-soft)]">Public picks only</span>
      </div>
      <h1 className="text-[32px] sm:text-[52px] font-extrabold tracking-[-0.03em] leading-[1.02] mb-4 max-w-[760px]">
        {copy.title}
      </h1>
      <p className="text-[15px] sm:text-base text-[var(--color-text-muted)] max-w-[640px] leading-relaxed">
        {copy.lead}{" "}
        <span className="text-[var(--color-pos)] font-bold">Records you can verify.</span>
      </p>
      {stats && stats.cappersCount > 0 && (
        <div className="mt-6 sm:mt-7 flex items-baseline gap-7 sm:gap-12 flex-wrap">
          <Stat value={stats.totalPicks.toLocaleString()} label="Picks graded" />
          <Stat value={stats.cappersCount.toString()} label="Cappers tracked" />
        </div>
      )}
    </header>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="leading-none">
      <div className="text-[26px] sm:text-[32px] font-extrabold tabular-nums tracking-[-0.025em]">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)] mt-2">
        {label}
      </div>
    </div>
  );
}
