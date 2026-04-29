import Link from "next/link";
import { XIcon } from "@/components/icons/XIcon";
import { formatBetDescriptor } from "@/lib/markets";
import { formatUnitsSmart } from "@/lib/formatters";
import type { HistoryPick } from "@/lib/types";

const PAGE_SIZE = 25;

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
      <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-6 py-10 text-center text-[13px] text-[var(--color-text-muted)] italic">
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
    <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div
        className="grid grid-cols-[60px_1fr_50px_70px_70px_60px_70px_30px] gap-3 items-center px-4 py-2.5
                      bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-border)]
                      text-[10px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]"
      >
        <div>Date</div>
        <div>Selection</div>
        <div className="text-right">Line</div>
        <div className="text-right">Odds</div>
        <div className="text-right">Units</div>
        <div className="text-center">Result</div>
        <div className="text-right">Profit</div>
        <div />
      </div>
      {history.map((p) => (
        <HistoryRow key={p.id} pick={p} />
      ))}
      <div
        className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]
                      text-[11px] text-[var(--color-text-muted)] font-medium"
      >
        <div>
          Showing {showingFrom}-{showingTo} of {total}
        </div>
        <div className="flex items-center gap-2">
          {offset > 0 && (
            <Link
              href={pageQuery(prevOffset)}
              className="px-3 py-1 rounded-md bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]
                         text-[var(--color-text-soft)] text-[11px] font-bold"
            >
              ← Newer
            </Link>
          )}
          {nextOffset < total && (
            <Link
              href={pageQuery(nextOffset)}
              className="px-3 py-1 rounded-md bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]
                         text-[var(--color-text-soft)] text-[11px] font-bold"
            >
              Older →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ pick }: { pick: HistoryPick }) {
  const date = formatDate(pick.posted_at);
  const isParlay = pick.kind === "parlay";
  const oddsText =
    pick.odds_taken == null
      ? "—"
      : pick.odds_taken > 0
        ? `+${pick.odds_taken}`
        : String(pick.odds_taken);
  const profitColor =
    pick.profit_units == null
      ? "text-[var(--color-text-muted)]"
      : pick.profit_units > 0
        ? "text-[var(--color-pos)]"
        : pick.profit_units < 0
          ? "text-[var(--color-neg)]"
          : "text-[var(--color-text-muted)]";
  const outcomeBg =
    pick.outcome === "W"
      ? "bg-[var(--color-pos-soft)] text-[var(--color-pos)]"
      : pick.outcome === "L"
        ? "bg-[var(--color-neg-soft)] text-[var(--color-neg)]"
        : "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)]";

  return (
    <div
      className="grid grid-cols-[60px_1fr_50px_70px_70px_60px_70px_30px] gap-3 items-center px-4 py-2.5
                    border-b border-[rgba(255,255,255,0.03)] last:border-b-0 text-[12px]"
    >
      <div className="text-[var(--color-text-muted)] font-medium tabular-nums">{date ?? "—"}</div>
      <div className="min-w-0 truncate">
        {pick.game_label && (
          <span className="text-[var(--color-text-muted)] mr-2">{pick.game_label}</span>
        )}
        <span className="font-semibold text-[var(--color-text)]">
          {formatBetDescriptor({
            kind: isParlay ? "parlay" : "straight",
            leg_count: pick.leg_count ?? null,
            market: pick.market,
            selection: pick.selection,
            line: pick.line,
            odds_taken: pick.odds_taken,
          })}
        </span>
      </div>
      <div className="text-right tabular-nums text-[var(--color-text-soft)]">
        {pick.line != null ? pick.line : "—"}
      </div>
      <div className="text-right tabular-nums text-[var(--color-text-soft)]">{oddsText}</div>
      <div className="text-right tabular-nums text-[var(--color-text-soft)]">
        {pick.units != null && pick.units > 0 ? `${pick.units > 5 ? 1 : pick.units}u` : "1u"}
      </div>
      <div className="text-center">
        <span
          className={`inline-flex items-center justify-center w-6 h-[18px] rounded text-[10px] font-extrabold uppercase ${outcomeBg}`}
        >
          {pick.outcome ?? "—"}
        </span>
      </div>
      <div className={`text-right tabular-nums font-bold ${profitColor}`}>
        {pick.profit_units != null ? `${formatUnitsSmart(pick.profit_units)}u` : "—"}
      </div>
      <div className="text-right">
        {pick.tweet_url ? (
          <a
            href={pick.tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View tweet"
            className="inline-flex w-6 h-6 items-center justify-center rounded text-[var(--color-text-soft)]
                       hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <XIcon size={10} glow />
          </a>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
