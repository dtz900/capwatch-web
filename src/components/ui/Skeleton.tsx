import contestJson from "../../../public/splash-contest.json";
import { activeContests, type SplashContestFile } from "@/lib/tof/contest";

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
 * Footprint of the inline SplashContests module: one full-width promo card
 * per open contest (about 219px on desktop, 360px on a phone where the pills
 * stack), or nothing at all when no contest is open. Boards insert it between
 * sections once rows exist, so the fallback has to hold exactly that slot or
 * the streamed board pushes everything below it (Codex on #204 and #209).
 * The count comes from the same contest file the module reads, evaluated at
 * render, so the fallback and the real thing agree.
 */
export function BannerSkeleton({ className = "" }: { className?: string }) {
  const count = activeContests(contestJson as SplashContestFile).length;
  return (
    <div data-testid="banner-skeleton" className={count > 0 ? `flex w-full flex-col gap-4 ${className}` : "hidden"} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="w-full h-[360px] sm:h-[219px] rounded-lg" />
      ))}
    </div>
  );
}
