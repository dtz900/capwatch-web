import { XIcon } from "@/components/icons/XIcon";
import { formatBetDescriptor } from "@/lib/markets";
import type { HistoryPick } from "@/lib/types";

function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null;
  const posted = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - posted) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatStakeUnits(u: number | null): string | null {
  if (u == null || u <= 0) return null;
  const clamped = u > 5 ? 1 : u;
  return `${clamped.toFixed(clamped % 1 === 0 ? 0 : 1)}u`;
}

export function PendingBlock({ picks }: { picks: HistoryPick[] }) {
  if (picks.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] animate-pulse" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          Live · {picks.length} pending
        </span>
      </div>
      <div className="flex flex-col">
        {picks.map((p) => {
          const isParlay = p.kind === "parlay";
          const posted = formatPostedAt(p.posted_at);
          const stake = formatStakeUnits(p.units);
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-[var(--color-text)] truncate">
                  {p.game_label && (
                    <span className="text-[var(--color-text-muted)] font-medium mr-2">
                      {p.game_label}
                    </span>
                  )}
                  {formatBetDescriptor({
                    kind: isParlay ? "parlay" : "straight",
                    leg_count: p.leg_count ?? null,
                    market: p.market,
                    selection: p.selection,
                    line: p.line,
                    odds_taken: p.odds_taken,
                  })}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">
                  {stake && <span className="mr-1.5">{stake}</span>}
                  {posted && <span className="opacity-80">{posted}</span>}
                </div>
              </div>
              {p.tweet_url && (
                <a
                  href={p.tweet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View tweet"
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md
                             bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)]
                             hover:text-white hover:bg-[rgba(255,255,255,0.10)] transition-colors"
                >
                  <XIcon size={11} glow />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
