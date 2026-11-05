import { liveMarketTooltip } from "@/lib/live-market";

/** Small tag for a pick graded at the live market price instead of the price
 * the capper posted. Same neutral chip as the "no odds given" stamp. */
export function MarketOddsTag({
  postedOdds,
  className = "",
}: {
  postedOdds?: number | null;
  className?: string;
}) {
  return (
    <span
      className={`shrink-0 inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded
                  text-[9px] uppercase tracking-[0.08em] font-bold
                  bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.18)]
                  text-[var(--color-text-muted)] ${className}`}
      title={liveMarketTooltip(postedOdds)}
    >
      Market odds
    </span>
  );
}
