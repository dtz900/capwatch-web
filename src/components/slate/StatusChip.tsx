import { liveLabel } from "@/lib/live-label";
import type { SlateGame } from "@/lib/types";
import type { ScoreStatusState } from "./ScoreStatus";

export function formatGameTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const t = new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
    return `${t} ET`;
  } catch {
    return null;
  }
}

export function StatusChip({
  lifecycle,
  game,
  gameTime,
}: {
  lifecycle: ScoreStatusState;
  game: SlateGame;
  gameTime: string | null;
}) {
  if (lifecycle === "pre") {
    const time = formatGameTime(gameTime);
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] ring-1 ring-inset ring-[rgba(255,255,255,0.08)] text-[10px] uppercase tracking-[0.18em] font-bold tabular-nums whitespace-nowrap">
        {time ?? ""}
      </span>
    );
  }
  if (lifecycle === "live") {
    const label = liveLabel(game);
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-pos-soft)] text-[var(--color-pos)] ring-1 ring-inset ring-[rgba(25,245,124,0.25)] text-[10px] uppercase tracking-[0.18em] font-bold whitespace-nowrap">
        <span
          className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
          aria-hidden
        />
        {label}
      </span>
    );
  }
  if (lifecycle === "final_pending") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] ring-1 ring-inset ring-[rgba(255,255,255,0.14)] text-[10px] uppercase tracking-[0.18em] font-bold">
          FINAL
        </span>
        <span className="text-[10px] italic text-[var(--color-text-muted)] tracking-wider">
          grading…
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] ring-1 ring-inset ring-[rgba(255,255,255,0.14)] text-[10px] uppercase tracking-[0.18em] font-bold whitespace-nowrap">
    FINAL
    </span>
  );
}

export function deriveLifecycle(game: SlateGame): ScoreStatusState {
  // ISR-cached responses from before the backend started emitting
  // game_state may deliver undefined. Treat that as pre-game so we never
  // flash "FINAL · grading…" on a scheduled card during the cache turnover.
  if (!game.game_state) return "pre";
  if (game.game_state === "scheduled") return "pre";
  if (game.game_state === "in_progress") return "live";
  // Only straight picks gate the "grading…" suffix. Parlay legs stay
  // outcome=null until the parent parlay resolves, which depends on OTHER
  // games on the slate finishing. Waiting on them would leave this card
  // stuck in final_pending long after the game itself is decided.
  const anyStraightPending = game.picks.some(
    (p) => p.kind === "straight" && p.outcome === null,
  );
  return anyStraightPending ? "final_pending" : "final_graded";
}
