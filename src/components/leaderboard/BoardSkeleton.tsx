import { BannerSkeleton, Skeleton } from "@/components/ui/Skeleton";

const ROW_COUNT = 10;

/**
 * Suspense fallback for the home leaderboard: three podium cards, the inline
 * sportsbook banner slot, and a standings table of placeholder rows, sized to
 * the real components so the streamed board lands without shifting the page.
 */
export function BoardSkeleton() {
  return (
    <div role="status" aria-label="Loading leaderboard">
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1fr] gap-4 mb-9 items-stretch">
        <div className="lg:order-1 order-2 lg:mt-8 min-w-0"><PodiumCardSkeleton /></div>
        <div className="lg:order-2 order-1 min-w-0"><PodiumCardSkeleton gold /></div>
        <div className="lg:order-3 order-3 lg:mt-12 min-w-0"><PodiumCardSkeleton /></div>
      </section>
      <div className="my-8 flex justify-center">
        <BannerSkeleton />
      </div>
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl mb-9">
        <div className="hidden sm:flex items-center gap-3 px-[22px] py-3.5 border-b border-[var(--color-border)]">
          <Skeleton className="h-[10px] w-9" />
          <Skeleton className="h-[10px] w-[180px]" />
          <Skeleton className="h-[10px] w-[220px]" />
        </div>
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </section>
    </div>
  );
}

function PodiumCardSkeleton({ gold = false }: { gold?: boolean }) {
  return (
    <div
      data-testid="podium-skeleton"
      className={`relative h-full flex flex-col rounded-2xl overflow-hidden
                  bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d]
                  border border-[var(--color-border)]
                  ${gold ? "pt-7 px-7 pb-7 min-h-[300px]" : "pt-6 px-5 pb-5 min-h-[260px]"}`}
    >
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-6 w-[110px]" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className={`rounded-full ${gold ? "w-14 h-14" : "w-12 h-12"}`} />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-3 w-[100px]" />
        </div>
      </div>
      <div className="mt-auto grid grid-cols-3 gap-4">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div
      data-testid="row-skeleton"
      className="flex items-center gap-3 px-4 sm:px-[22px] py-3.5 sm:py-4 border-b border-[var(--color-border)] last:border-b-0"
    >
      <Skeleton className="h-3 w-6 shrink-0" />
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <Skeleton className="h-3 w-[140px] max-w-full" />
        <Skeleton className="h-2.5 w-[90px] max-w-full" />
      </div>
      <div className="hidden sm:flex items-center gap-6 shrink-0">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}
