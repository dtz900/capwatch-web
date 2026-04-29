import type { LastPick } from "@/lib/types";
import { formatBetDescriptor } from "@/lib/markets";
import { formatUnitsSmart } from "@/lib/formatters";

interface Props {
  picks: LastPick[];
  limit?: number;
}

export function RecentPicks({ picks, limit = 5 }: Props) {
  const visible = picks.slice(0, limit);
  if (visible.length === 0) {
    return (
      <span className="text-[11px] italic text-[var(--color-text-muted)]">
        No graded picks yet
      </span>
    );
  }

  return (
    <ul className="flex flex-col w-full">
      {visible.map((pick, i) => {
        const date = pick.posted_at
          ? new Date(pick.posted_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : null;

        const chipClass =
          pick.outcome === "W"
            ? "bg-[var(--color-pos-soft)] text-[var(--color-pos)]"
            : pick.outcome === "L"
              ? "bg-[var(--color-neg-soft)] text-[var(--color-neg)]"
              : "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)]";

        const profitColor =
          pick.profit_units != null && pick.profit_units >= 0
            ? "text-[var(--color-pos)]"
            : "text-[var(--color-neg)]";

        const inner = (
          <>
            <span
              aria-label={
                pick.outcome === "W"
                  ? "Win"
                  : pick.outcome === "L"
                    ? "Loss"
                    : "Push"
              }
              className={`shrink-0 inline-flex items-center justify-center w-[22px] h-[18px] rounded text-[10px] font-extrabold uppercase ${chipClass}`}
            >
              {pick.outcome}
            </span>
            <span className="flex-1 min-w-0 truncate text-[11px] font-semibold text-[var(--color-text)]">
              {formatBetDescriptor(pick)}
            </span>
            {pick.outcome === "P" ? (
              <span className="shrink-0 text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold">
                Push
              </span>
            ) : pick.profit_units != null ? (
              <span
                className={`shrink-0 tabular-nums text-[11px] font-extrabold ${profitColor}`}
              >
                {formatUnitsSmart(pick.profit_units)}u
              </span>
            ) : null}
            {date && (
              <span className="shrink-0 text-[10px] text-[var(--color-text-muted)] font-medium tabular-nums w-[40px] text-right">
                {date}
              </span>
            )}
          </>
        );

        const rowClass =
          "flex items-center gap-2.5 py-1.5 px-1.5 -mx-1.5 rounded-md transition-colors";

        return (
          <li key={i}>
            {pick.tweet_url ? (
              <a
                href={pick.tweet_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View pick on X: ${formatBetDescriptor(pick)}`}
                className={`${rowClass} hover:bg-[rgba(255,255,255,0.04)] cursor-pointer`}
              >
                {inner}
              </a>
            ) : (
              <div className={rowClass}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
