import type { ResearchResponse, ResearchStatRow, ResearchWindow } from "@/lib/api";

const WINDOW_LABEL: Record<ResearchWindow, string> = {
  L7: "L7",
  L30: "L30",
  season: "this season",
  all: "all-time",
};

function fmtUnits(u: number): string {
  if (u === 0) return "0u";
  const sign = u > 0 ? "+" : "";
  // Trim trailing zeros so +1.50u reads as +1.5u, +1.00u as +1u.
  const rounded = u.toFixed(2).replace(/\.?0+$/, "");
  return `${sign}${rounded}u`;
}

function recordStr(wins: number, losses: number, pushes: number): string {
  return pushes > 0 ? `${wins}-${losses}-${pushes}` : `${wins}-${losses}`;
}

function unitsClause(priced: number, units: number): string {
  // Only render the units number when there's a meaningful priced sample,
  // otherwise the snippet implies "+0u over N picks" when really N legs
  // just had no posted odds. 5 is the floor where the synthesized number
  // starts to mean something rather than being one straight pick.
  if (priced < 5) return "";
  return ` (${fmtUnits(units)})`;
}

/**
 * Paste-ready X reply snippet.
 *
 * Player mode -> leads with subject record, then up to 3 per-market lines
 * (HR props, Hits, etc.) when there's enough variety. The market breakdown
 * is the part that lands as a receipt; the headline alone is too generic.
 *
 * Team mode -> just the headline. Team picks don't split into useful
 * sub-categories in the data we have.
 *
 * Empty-state -> a single line saying nothing's tracked yet so the user
 * can still paste something instead of dropping a half-formed reply.
 */
export function buildSnippet(r: ResearchResponse): string {
  const { subject, mode, window, totals, by_stat } = r;
  const windowLabel = WINDOW_LABEL[window];

  if (totals.picks === 0) {
    return `No tracked sharp picks on ${subject} ${windowLabel} yet.`;
  }

  if (mode === "team") {
    return `Tracked sharps on ${subject} ${windowLabel}: ${recordStr(totals.wins, totals.losses, totals.pushes)}${unitsClause(totals.priced_picks, totals.units)}.`;
  }

  // Player mode.
  const head = `Tracked sharps on ${subject} ${windowLabel}: ${recordStr(totals.wins, totals.losses, totals.pushes)}${unitsClause(totals.priced_picks, totals.units)}.`;

  // Per-market lines: take up to 3 stat groups that have at least 3 picks,
  // sorted by sample size (already sorted desc by backend). 3-pick floor
  // keeps "1-0 on Pitch count" noise out of the receipt.
  const meaningful: ResearchStatRow[] = by_stat.filter((s) => s.picks >= 3);
  if (meaningful.length === 0) {
    return head;
  }
  const lines = meaningful.slice(0, 3).map((s) => {
    return `${s.label}: ${recordStr(s.wins, s.losses, s.pushes)}${unitsClause(s.priced_picks, s.units)}`;
  });
  return [head, ...lines].join("\n");
}
