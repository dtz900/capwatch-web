import Link from "next/link";
import { CapperAvatar } from "./CapperAvatar";
import { LivePicksIndicator } from "./LivePicksIndicator";
import { XIcon } from "@/components/icons/XIcon";
import { XProfileLink } from "@/components/analytics/XProfileLink";
import { formatHandle } from "@/lib/formatters";
import { buildProfileHref } from "@/lib/profileHref";
import type { PendingCapperRow, SportFilter, Window } from "@/lib/types";

interface Props {
  rows: PendingCapperRow[];
  sport: SportFilter;
  window?: Window;
  /** True when the ranked standings above are empty (the whole board is
   *  pending-only, e.g. the NFL board before Week 1 settles). */
  standalone: boolean;
}

/**
 * Cappers with bets in on the live slate or week who have no ranked row
 * yet. They belong on the board the moment their picks are captured, not
 * only once something grades.
 */
export function PendingBoard({ rows, sport, window, standalone }: Props) {
  if (rows.length === 0) return null;
  const title = sport === "nfl" ? "Picks in this week" : sport === "mlb" ? "Action tonight" : "Action in";
  const sub = standalone
    ? "Ranked once enough of their picks grade. Live counts update as the games settle."
    : "Not yet ranked in this window.";
  return (
    <section
      data-testid="pending-board"
      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl mb-9"
    >
      <div className="flex items-baseline justify-between gap-4 px-[22px] py-4 border-b border-[var(--color-border)]">
        <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">{title}</h2>
        <span className="text-[11px] text-[var(--color-text-muted)] font-medium">{sub}</span>
      </div>
      {rows.map((r) => {
        const href = r.handle ? buildProfileHref(r.handle, { window, sport }) : null;
        const node = (
          <div className="flex items-center gap-3 min-w-0">
            <CapperAvatar url={r.profile_image_url} handle={r.handle} size={32} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold truncate">{r.display_name ?? r.handle}</span>
              </div>
              <div className="text-[12px] text-[var(--color-text-muted)] truncate">
                {r.handle ? formatHandle(r.handle) : ""}
              </div>
            </div>
          </div>
        );
        return (
          <div
            key={r.capper_id}
            className="grid grid-cols-[minmax(0,1fr)_auto_44px] items-center gap-3 px-[22px] py-3 border-b border-[var(--color-border)] last:border-b-0"
          >
            {href ? (
              <Link href={href} className="block min-w-0">
                {node}
              </Link>
            ) : (
              node
            )}
            <LivePicksIndicator capperId={r.capper_id} initialCount={r.live_picks_count} />
            <div className="text-right">
              <XProfileLink
                handle={r.handle}
                surface="leaderboard"
                className="inline-flex w-7 h-7 rounded-md bg-[rgba(255,255,255,0.04)] items-center justify-center text-[var(--color-text-muted)]"
              >
                <XIcon size={11} />
              </XProfileLink>
            </div>
          </div>
        );
      })}
    </section>
  );
}
