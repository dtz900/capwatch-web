import type { LastPick } from "@/lib/types";
import { formatBetDescriptor } from "@/lib/markets";
import { formatUnitsSmart } from "@/lib/formatters";
import { XIcon } from "@/components/icons/XIcon";

interface Props {
  picks: LastPick[];
  limit?: number;
}

const BAR_COLOR = {
  W: "bg-[var(--color-pos)]",
  L: "bg-[var(--color-neg)]",
  P: "bg-[var(--color-text-muted)]",
} as const;

export function RecentPicks({ picks, limit = 5 }: Props) {
  const visible = picks.slice(0, limit);
  if (visible.length === 0) {
    return (
      <span className="text-[11px] italic text-[var(--color-text-muted)]">No graded picks yet</span>
    );
  }

  return (
    <ul className="flex flex-col gap-1 w-full">
      {visible.map((pick, i) => {
        const isParlay = pick.kind === "parlay";
        const barColor = isParlay ? "bg-[var(--color-gold)]" : BAR_COLOR[pick.outcome];
        const date = pick.posted_at
          ? new Date(pick.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : null;
        const betColor = isParlay
          ? "text-[var(--color-gold)]"
          : pick.outcome === "W" ? "text-[var(--color-pos)]"
          : pick.outcome === "L" ? "text-[var(--color-neg)]"
          : "text-[var(--color-text-soft)]";

        return (
          <li
            key={i}
            className="flex items-stretch gap-2.5 py-1.5 group"
          >
            <span
              aria-hidden="true"
              className={`shrink-0 w-[3px] rounded-full ${barColor}`}
            />
            <div className="flex-1 min-w-0 flex items-center gap-2 text-[11px]">
              <span className={`flex-1 min-w-0 truncate font-semibold ${betColor}`}>
                {formatBetDescriptor(pick)}
              </span>
              {isParlay && pick.profit_units != null && (
                <span
                  className={`shrink-0 tabular-nums font-bold ${
                    pick.profit_units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
                  }`}
                >
                  {formatUnitsSmart(pick.profit_units)}u
                </span>
              )}
              {date && (
                <span className="shrink-0 text-[10px] text-[var(--color-text-muted)] font-medium tabular-nums">
                  {date}
                </span>
              )}
            </div>
            {pick.tweet_url ? (
              <a
                href={pick.tweet_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View original tweet"
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded
                           text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                           hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                <XIcon size={10} />
              </a>
            ) : (
              <span className="shrink-0 w-5 h-5" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
