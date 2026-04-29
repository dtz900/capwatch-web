import { LiveBadge } from "./LiveBadge";

export function Hero() {
  return (
    <header className="pt-14 pb-8">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em]
                      text-[var(--color-text-muted)] mb-3.5
                      flex items-center gap-2 flex-wrap">
        <span>MLB · 2026 Season</span>
        <span className="opacity-40">·</span>
        <LiveBadge />
        <span className="opacity-40">·</span>
        <span className="text-[var(--color-text-soft)]">Public picks only</span>
      </div>
      <h1 className="text-[42px] font-extrabold tracking-[-0.03em] leading-[1.05] mb-3 max-w-[760px]">
        MLB Twitter Capper Rankings
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] max-w-[640px] leading-relaxed">
        Every <span className="text-[var(--color-text-soft)] font-semibold">public</span> MLB pick from a tracked Twitter capper, parsed within seconds and graded against the final outcome. Picks posted behind paywalls are not tracked.
      </p>
    </header>
  );
}
