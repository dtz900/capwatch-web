import { Skeleton } from "@/components/ui/Skeleton";
import { SportToggle } from "./SportToggle";
import { DateToggle } from "./DateToggle";
import type { SlateSport } from "@/lib/api";

const GAME_COUNT = 3;
const RAIL_COUNT = 6;

interface Props {
  sport: SlateSport;
  /** The heading the resolved board will render, so the swap is invisible. */
  heading: string;
  mlbCaption: string;
  nflCaption: string;
  nbaCaption: string;
  /** Day boards (MLB, NBA) show the today/tomorrow toggle; the NFL week board passes null. */
  dateParam: "today" | "tomorrow" | null;
}

/**
 * Suspense fallback for /slate. Mirrors the resolved layout (rail strip, rail
 * column, league chips, heading, game cards) so the shell paints at once and
 * the real board lands in place without a layout jump.
 */
export function SlateSkeleton({ sport, heading, mlbCaption, nflCaption, nbaCaption, dateParam }: Props) {
  return (
    <div role="status" aria-label="Loading slate">
      <div className="xl:hidden sticky top-16 z-20 h-[46px] bg-[#0a0a0c] border-b border-[rgba(255,255,255,0.06)]">
        <div className="mx-auto max-w-[1400px] h-full flex items-center gap-3 overflow-hidden px-4 sm:px-7">
          {Array.from({ length: RAIL_COUNT }, (_, i) => (
            <Skeleton key={i} className="h-5 w-16 shrink-0" />
          ))}
        </div>
      </div>
      <main className="max-w-[1400px] mx-auto px-4 sm:px-7 pb-24">
        <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-8">
          <div className="hidden xl:flex flex-col sticky top-16 self-start shrink-0 w-[220px] py-3">
            <div className="shrink-0 px-1 pb-2">
              <Skeleton className="h-[10px] w-[90px]" />
            </div>
            <div className="border border-[rgba(255,255,255,0.08)] divide-y divide-[rgba(255,255,255,0.08)]">
              {Array.from({ length: RAIL_COUNT }, (_, i) => (
                <div key={i} className="h-16 flex flex-col justify-center gap-2 px-3">
                  <Skeleton className="h-3 w-[120px]" />
                  <Skeleton className="h-2.5 w-[70px]" />
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="pt-8 sm:pt-10 max-w-[520px]">
              <SportToggle current={sport} mlbCaption={mlbCaption} nflCaption={nflCaption} nbaCaption={nbaCaption} />
            </div>
            <header className="pt-8 pb-3 flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-[44px] font-extrabold tracking-[-0.03em] leading-[1]">{heading}</h1>
                <Skeleton className="h-[13px] w-[280px] max-w-full mt-3" />
                <Skeleton className="h-[12px] w-[520px] max-w-full mt-2" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {dateParam !== null && <DateToggle current={dateParam} />}
                <Skeleton className="h-9 w-[120px] rounded-full" />
              </div>
            </header>
            <div className="flex flex-col gap-5 mt-2">
              {Array.from({ length: GAME_COUNT }, (_, i) => (
                <GameBlockSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function GameBlockSkeleton() {
  return (
    <section
      data-testid="game-skeleton"
      className="relative rounded-2xl bg-gradient-to-b from-[#15151a] via-[#101015] to-[#0b0b0f]
                 border border-[rgba(255,255,255,0.07)]"
    >
      <div className="h-3 sm:h-4" />
      <div className="bg-[#15151a] border-t border-[rgba(255,255,255,0.10)] px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" />
            <Skeleton className="h-[14px] w-10" />
          </div>
          <Skeleton className="h-6 w-[72px] rounded-full" />
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Skeleton className="h-[14px] w-10" />
            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" />
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-6 py-4 flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-7 h-7 rounded-full shrink-0" />
            <Skeleton className="h-3 w-[120px]" />
            <Skeleton className="h-3 flex-1 max-w-[220px]" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
        ))}
      </div>
    </section>
  );
}
