import { LiveBadge } from "./LiveBadge";

interface HeroProps {
  totalCappers: number;
  totalPicks: number;
}

export function Hero({ totalCappers, totalPicks }: HeroProps) {
  return (
    <header className="pt-14 pb-8">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em]
                      text-[var(--color-text-muted)] mb-3.5
                      flex items-center gap-2">
        <span>MLB · 2026 Season</span>
        <span className="opacity-40">·</span>
        <LiveBadge />
      </div>
      <h1 className="text-[42px] font-extrabold tracking-[-0.03em] leading-[1.05] mb-3 max-w-[760px]">
        MLB Twitter Capper Rankings
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] max-w-[620px] leading-relaxed">
        Every public MLB pick from a tracked Twitter capper, parsed within seconds and graded against the final game outcome. {totalCappers} cappers tracked. {totalPicks} picks graded. Updated daily.
      </p>
    </header>
  );
}
