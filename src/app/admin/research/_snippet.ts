import type { ResearchResponse, ResearchStatRow, ResearchWindow } from "@/lib/api";

const WINDOW_LABEL: Record<ResearchWindow, string> = {
  L7: "L7",
  L30: "L30",
  season: "this season",
  all: "all-time",
};

function recordStr(wins: number, losses: number, pushes: number): string {
  return pushes > 0 ? `${wins}-${losses}-${pushes}` : `${wins}-${losses}`;
}

function winRatePct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function rateClause(row: { picks: number; pushes: number; win_rate: number }): string {
  // Win rate is the headline stat. We skip it for tiny samples where the
  // percentage swings wildly on a single result.
  const decided = row.picks - row.pushes;
  if (decided < 3) return "";
  return ` (${winRatePct(row.win_rate)})`;
}

/**
 * Paste-ready X reply snippet.
 *
 * Leads with record + win rate. Units / ROI are intentionally absent --
 * the synthesized number can be skewed by one alt-line longshot hit and
 * "+1111% ROI" reads as a bug to anyone glancing at it. Win rate is
 * universally interpretable: 40% on a guy is a fade, 60% is fire.
 *
 * Player mode adds up to 3 per-market lines (HR props, Hits, etc.) for
 * markets with 3+ picks. Team mode stays single-line.
 */
export function buildSnippet(r: ResearchResponse): string {
  const { subject, mode, window, totals, by_stat } = r;
  const windowLabel = WINDOW_LABEL[window];

  if (totals.picks === 0) {
    return `No tracked sharp picks on ${subject} ${windowLabel} yet.`;
  }

  const head = `Tracked sharps on ${subject} ${windowLabel}: ${recordStr(totals.wins, totals.losses, totals.pushes)}${rateClause(totals)}.`;

  if (mode === "team") {
    return head;
  }

  const meaningful: ResearchStatRow[] = by_stat.filter((s) => s.picks - s.pushes >= 3);
  if (meaningful.length === 0) {
    return head;
  }
  const lines = meaningful
    .slice(0, 3)
    .map((s) => `${s.label}: ${recordStr(s.wins, s.losses, s.pushes)}${rateClause(s)}`);
  return [head, ...lines].join("\n");
}
