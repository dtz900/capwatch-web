/**
 * Pulsing placeholder block for streamed Suspense fallbacks.
 *
 * Plain background only, no text and no image: a skeleton must never register
 * as the page's Largest Contentful Paint element, and it must read as "not
 * tappable yet" so visitors stop rage-clicking a half-rendered board.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-[rgba(255,255,255,0.05)] ${className}`} />;
}

/**
 * Footprint of the inline SplashContests module (a 720px-wide card with a
 * header row, one or two contest rows and a disclosure line). Boards insert
 * it between sections once rows exist, so the fallback has to hold that slot
 * or the streamed board pushes everything below it down (Codex on #204).
 */
export function BannerSkeleton() {
  return (
    <div data-testid="banner-skeleton" className="w-full">
      <Skeleton className="w-full h-[150px] rounded-lg" />
    </div>
  );
}
