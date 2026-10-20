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
