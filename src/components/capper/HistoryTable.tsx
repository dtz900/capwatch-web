import Link from "next/link";
import { XIcon } from "@/components/icons/XIcon";
import { ChevronIcon } from "@/components/icons/ChevronIcon";
import { formatBetDescriptor } from "@/lib/markets";
import { formatUnitsSmart } from "@/lib/formatters";
import type { HistoryPick } from "@/lib/types";

const PAGE_SIZE = 25;

const DESKTOP_GRID =
  "hidden sm:grid grid-cols-[64px_minmax(220px,1fr)_56px_72px_64px_80px_28px] gap-3 items-center";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function HistoryTable({
  history,
  total,
  offset,
  basePath,
  query,
}: {
  history: HistoryPick[];
  total: number;
  offset: number;
  basePath: string;
  query: URLSearchParams;
}) {
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-10 text-center text-[13px] text-[var(--color-text-muted)] italic">
        No picks match these filters.
      </div>
    );
  }

  const prevOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  const showingFrom = offset + 1;
  const showingTo = Math.min(offset + history.length, total);

  const pageQuery = (newOffset: number) => {
    const params = new URLSearchParams(query.toString());
    if (newOffset === 0) params.delete("offset");
    else params.set("offset", String(newOffset));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
      <div
        className={`${DESKTOP_GRID} pl-[19px] pr-5 py-3
                    border-b border-[var(--color-border)]
                    text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)]`}
      >
        <div>Date</div>
        <div>Selection</div>
        <div className="text-right">Line</div>
        <div className="text-right">Odds</div>
        <div className="text-right">Units</div>
        <div className="text-right" title="Profit excludes prop picks where the capper did not post odds. Those picks count toward Win % but not units.">
          Profit<sup className="ml-0.5 text-[var(--color-text-muted)]">*</sup>
        </div>
        <div></div>
      </div>
      {history.map((p, i) => (
        <HistoryRow key={p.id} pick={p} isLast={i === history.length - 1} />
      ))}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--color-border)]
                      text-[11px] text-[var(--color-text-muted)] font-medium">
        <div>
          Showing {showingFrom}-{showingTo} of {total}
        </div>
        <div className="flex items-center gap-2">
          {offset > 0 && (
            <Link
              href={pageQuery(prevOffset)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                         bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]
                         text-[var(--color-text-soft)] hover:text-[var(--color-text)]
                         text-[11px] font-bold tracking-[0.02em] transition-colors"
            >
              <ChevronIcon size={11} className="rotate-90" />
              Newer
            </Link>
          )}
          {nextOffset < total && (
            <Link
              href={pageQuery(nextOffset)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                         bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]
                         text-[var(--color-text-soft)] hover:text-[var(--color-text)]
                         text-[11px] font-bold tracking-[0.02em] transition-colors"
            >
              Older
              <ChevronIcon size={11} className="-rotate-90" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ pick, isLast }: { pick: HistoryPick; isLast: boolean }) {
  const date = formatDate(pick.posted_at);
  const isParlay = pick.kind === "parlay";
  // Display grading_odds (the value the grader actually used) when present,
  // falling back to odds_taken for legacy rows. The (close) indicator marks
  // picks where the capper didn't post American odds and we graded against
  // the Pinnacle moneyline close.
  const displayedOdds = pick.grading_odds ?? pick.odds_taken;
  const oddsText =
    displayedOdds == null
      ? ""
      : displayedOdds > 0
        ? `+${displayedOdds}`
        : String(displayedOdds);
  const isPinnacleClose = pick.grading_odds_source === "pinnacle_close";
  // outcome-only: capper posted no odds and we have no honest close-line
  // proxy (player props, or ML where Pinnacle is missing). Hide the odds
  // and profit cells; the row still shows W/L via the bar color.
  const isOutcomeOnly = pick.grading_odds_source === "no_close_available";
  const profitColor =
    pick.profit_units == null
      ? "text-[var(--color-text-muted)]"
      : pick.profit_units > 0
        ? "text-[var(--color-pos)]"
        : pick.profit_units < 0
          ? "text-[var(--color-neg)]"
          : "text-[var(--color-text-muted)]";
  const barColor =
    pick.outcome === "W"
      ? "bg-[var(--color-pos)]"
      : pick.outcome === "L"
        ? "bg-[var(--color-neg)]"
        : pick.outcome === "P"
          ? "bg-[rgba(255,255,255,0.28)]"
          : "bg-[rgba(255,255,255,0.06)]";
  const unitsValue =
    pick.units != null && pick.units > 0 ? (pick.units > 5 ? 1 : pick.units) : 1;

  const selectionNode = (
    <span className={`font-bold ${isParlay ? "text-[var(--color-gold)]" : "text-[var(--color-text)]"}`}>
      {formatBetDescriptor({
        kind: isParlay ? "parlay" : "straight",
        leg_count: pick.leg_count ?? null,
        market: pick.market,
        selection: pick.selection,
        line: pick.line,
        odds_taken: pick.odds_taken,
      })}
    </span>
  );

  return (
    <>
      <div
        className={`group/row relative ${DESKTOP_GRID} pl-[19px] pr-5 py-3.5
                    hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-150
                    ${isLast ? "" : "sm:border-b sm:border-[rgba(255,255,255,0.035)]"}`}
      >
        <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-[3px] ${barColor}`} />
        <div className="text-[12px] text-[var(--color-text-muted)] font-medium tabular-nums">
          {date ?? ""}
        </div>
        <div className="min-w-0 text-[13px] flex items-center gap-2">
          <span className="truncate">
            {pick.game_label && (
              <span className="text-[var(--color-text-muted)] mr-2 font-medium">
                {pick.game_label}
              </span>
            )}
            {selectionNode}
          </span>
          {pick.deleted_after_game_start && (
            <span
              className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded
                         text-[9px] uppercase tracking-[0.12em] font-bold
                         bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.55)]
                         text-[#ef4444]"
              title="The capper deleted this tweet AFTER the game started. TailSlips kept the receipt."
            >
              Deleted after first pitch
            </span>
          )}
          {pick.was_deleted_on_x && !pick.deleted_after_game_start && (
            <span
              className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded
                         text-[9px] uppercase tracking-[0.12em] font-bold
                         bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.45)]
                         text-[#f59e0b]"
              title="The capper deleted this tweet from X. TailSlips kept the receipt."
            >
              Deleted on X
            </span>
          )}
        </div>
        <div className="text-right tabular-nums text-[12px] text-[var(--color-text-soft)]">
          {pick.line != null ? pick.line : ""}
        </div>
        <div className="text-right tabular-nums text-[12px] text-[var(--color-text-soft)]">
          {isOutcomeOnly ? (
            <span
              className="text-[10px] italic text-[var(--color-text-muted)]"
              title="Capper did not post odds. Counted toward Win % only."
            >
              no odds
            </span>
          ) : (
            <>
              {oddsText}
              {isPinnacleClose && (
                <span
                  className="ml-1 text-[10px] text-[var(--color-text-muted)] font-medium"
                  title="Capper did not post odds. Graded at Pinnacle moneyline close."
                >
                  (close)
                </span>
              )}
            </>
          )}
        </div>
        <div className="text-right tabular-nums text-[12px] text-[var(--color-text-soft)] font-medium">
          {isOutcomeOnly ? "" : `${unitsValue}u`}
        </div>
        <div className={`text-right tabular-nums text-[13px] font-extrabold ${profitColor}`}>
          {isOutcomeOnly
            ? ""
            : pick.profit_units != null
              ? `${formatUnitsSmart(pick.profit_units)}u`
              : ""}
        </div>
        <div className="flex justify-end">
          {pick.deleted_after_game_start ? (
            <span
              aria-label="Tweet deleted after first pitch"
              title="The capper deleted this tweet AFTER the game started. TailSlips kept the receipt."
              className="inline-flex w-7 h-7 items-center justify-center rounded-md
                         bg-[rgba(239,68,68,0.10)] text-[#ef4444] opacity-90"
            >
              <XIcon size={11} />
            </span>
          ) : pick.was_deleted_on_x ? (
            <span
              aria-label="Tweet deleted by capper"
              title="The capper deleted this tweet. TailSlips kept the receipt."
              className="inline-flex w-7 h-7 items-center justify-center rounded-md
                         bg-[rgba(245,158,11,0.08)] text-[#f59e0b] opacity-90"
            >
              <XIcon size={11} />
            </span>
          ) : pick.tweet_url ? (
            <a
              href={pick.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View tweet"
              className="inline-flex w-7 h-7 items-center justify-center rounded-md
                         text-[var(--color-text-muted)]
                         opacity-0 group-hover/row:opacity-100
                         hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text)]
                         transition-all duration-150"
            >
              <XIcon size={11} />
            </a>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
      </div>

      <div
        className={`sm:hidden relative pl-4 pr-4 py-3
                    ${isLast ? "" : "border-b border-[rgba(255,255,255,0.035)]"}`}
      >
        <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-[3px] ${barColor}`} />
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <div className="text-[11px] text-[var(--color-text-muted)] font-medium tabular-nums uppercase tracking-wide">
            {date ?? ""}
          </div>
          <div className={`tabular-nums text-[14px] font-extrabold ${profitColor}`}>
            {isOutcomeOnly
              ? (pick.outcome === "W" ? <span className="text-[var(--color-pos)]">W</span>
                : pick.outcome === "L" ? <span className="text-[var(--color-neg)]">L</span>
                : pick.outcome === "P" ? <span className="text-[var(--color-text-muted)]">P</span>
                : "")
              : pick.profit_units != null
                ? `${formatUnitsSmart(pick.profit_units)}u`
                : ""}
          </div>
        </div>
        <div className="text-[13px] leading-snug">
          {pick.game_label && (
            <span className="text-[var(--color-text-muted)] mr-1.5 font-medium">
              {pick.game_label}
            </span>
          )}
          {selectionNode}
        </div>
        {(pick.deleted_after_game_start || pick.was_deleted_on_x) && (
          <div className="mt-1.5">
            {pick.deleted_after_game_start ? (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded
                           text-[9px] uppercase tracking-[0.12em] font-bold
                           bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.55)]
                           text-[#ef4444]"
                title="The capper deleted this tweet AFTER the game started. TailSlips kept the receipt."
              >
                Deleted after first pitch
              </span>
            ) : (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded
                           text-[9px] uppercase tracking-[0.12em] font-bold
                           bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.45)]
                           text-[#f59e0b]"
                title="The capper deleted this tweet from X. TailSlips kept the receipt."
              >
                Deleted on X
              </span>
            )}
          </div>
        )}
        <div className="mt-1 text-[11px] text-[var(--color-text-muted)] font-medium tabular-nums flex items-center gap-3 flex-wrap">
          {pick.line != null && <span>Line {pick.line}</span>}
          {isOutcomeOnly ? (
            <span className="italic opacity-75" title="No odds posted. Counts toward Win % only.">
              no odds
            </span>
          ) : oddsText ? (
            <span>
              {oddsText}
              {isPinnacleClose && (
                <span className="ml-1 text-[10px] opacity-75">(close)</span>
              )}
            </span>
          ) : null}
          {!isOutcomeOnly && <span>{unitsValue}u</span>}
          {pick.deleted_after_game_start ? (
            <span
              aria-label="Tweet deleted after first pitch"
              title="The capper deleted this tweet AFTER the game started. TailSlips kept the receipt."
              className="ml-auto inline-flex w-7 h-7 items-center justify-center rounded-md
                         bg-[rgba(239,68,68,0.10)] text-[#ef4444] opacity-90"
            >
              <XIcon size={11} />
            </span>
          ) : pick.was_deleted_on_x ? (
            <span
              aria-label="Tweet deleted by capper"
              title="The capper deleted this tweet. TailSlips kept the receipt."
              className="ml-auto inline-flex w-7 h-7 items-center justify-center rounded-md
                         bg-[rgba(245,158,11,0.08)] text-[#f59e0b] opacity-90"
            >
              <XIcon size={11} />
            </span>
          ) : pick.tweet_url ? (
            <a
              href={pick.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View tweet"
              className="ml-auto inline-flex w-7 h-7 items-center justify-center rounded-md
                         bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)]"
            >
              <XIcon size={11} />
            </a>
          ) : null}
        </div>
      </div>
    </>
  );
}
