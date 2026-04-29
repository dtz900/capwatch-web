import type { LastPick } from "@/lib/types";
import { formatBetDescriptor, formatMarketLabel } from "@/lib/markets";
import { formatUnitsSmart } from "@/lib/formatters";
import { XIcon } from "@/components/icons/XIcon";

interface Props {
  picks: LastPick[];
  limit?: number;
  size?: "sm" | "md";
}

const OUTCOME_TEXT = {
  W: "text-[var(--color-pos)]",
  L: "text-[var(--color-neg)]",
  P: "text-[var(--color-text-muted)]",
} as const;

export function RecentPicks({ picks, limit = 5, size = "sm" }: Props) {
  const visible = picks.slice(0, limit);
  if (visible.length === 0) {
    return (
      <span className="text-[11px] italic text-[var(--color-text-muted)]">No graded picks yet</span>
    );
  }

  const textSize = size === "md" ? "text-[12px]" : "text-[11px]";
  const rowGap = size === "md" ? "gap-1.5" : "gap-1";

  return (
    <ul className={`flex flex-col ${rowGap} w-full`}>
      {visible.map((pick, i) => {
        const isParlay = pick.kind === "parlay";
        const descriptorColor = isParlay
          ? "text-[var(--color-gold)] font-semibold"
          : `${OUTCOME_TEXT[pick.outcome]} font-semibold`;

        return (
          <li
            key={i}
            className={`flex items-center gap-2.5 ${textSize} font-medium`}
          >
            <span className="flex-1 min-w-0 flex items-baseline gap-1.5 truncate">
              <span className="text-[var(--color-text-muted)] truncate">
                {formatMarketLabel(pick)}
              </span>
              <span className="opacity-30 shrink-0">·</span>
              <span className={`truncate ${descriptorColor}`}>
                {formatBetDescriptor(pick)}
              </span>
              {isParlay && pick.profit_units != null && (
                <>
                  <span className="opacity-30 shrink-0">·</span>
                  <span
                    className={`tabular-nums font-semibold shrink-0 ${
                      pick.profit_units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
                    }`}
                  >
                    {formatUnitsSmart(pick.profit_units)}u
                  </span>
                </>
              )}
            </span>
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
