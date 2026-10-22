/**
 * LIVE entry badge: the pick was posted after its game started, at an
 * in-game price. It grades W/L and units like any pick, but a live price has
 * no pregame close to compare against, so its CLV is 0 by rule (owner
 * decision 2026-10-22). Server-safe: no hooks, no date formatting.
 */
export function LiveEntryBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded
                  text-[9px] uppercase tracking-[0.12em] font-bold
                  bg-[rgba(25,245,124,0.10)] border border-[rgba(25,245,124,0.45)]
                  text-[var(--color-pos)] ${className}`}
      title="Live entry: posted after the game started, at in-game odds. Graded normally; CLV counts as 0 since there is no pregame close to compare."
    >
      Live
    </span>
  );
}
