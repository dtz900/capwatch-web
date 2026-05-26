import type { ResearchResponse, ResearchWindow } from "@/lib/api";

const WINDOW_LABEL: Record<ResearchWindow, string> = {
  L7: "L7",
  L30: "L30",
  season: "Season",
  all: "All-time",
};

function fmtUnits(u: number): string {
  // Strip trailing .0, sign always shown so + reads cleanly in a reply.
  if (u === 0) return "0u";
  const sign = u > 0 ? "+" : "";
  return `${sign}${u.toFixed(2).replace(/\.?0+$/, "")}u`;
}

function recordStr(wins: number, losses: number, pushes: number): string {
  return pushes > 0 ? `${wins}-${losses}-${pushes}` : `${wins}-${losses}`;
}

/**
 * Paste-ready X reply snippet. Kept under ~280 chars even for noisy
 * subjects by capping the best/worst lines and dropping the qualifier
 * line when only one capper has touched the subject.
 *
 * Format:
 *   Tracked sharps on <subject> (<window>): <record>, <units>
 *   Best: @handle <record> <units>
 *   Worst: @handle <record> <units>
 */
export function buildSnippet(r: ResearchResponse): string {
  const { subject, mode, window, totals, by_capper } = r;
  const subj =
    mode === "player"
      ? `${subject} props`
      : `${subject}`;
  const winLabel = WINDOW_LABEL[window];
  const head = `Tracked sharps on ${subj} (${winLabel}): ${recordStr(totals.wins, totals.losses, totals.pushes)}, ${fmtUnits(totals.units)}`;

  if (totals.picks === 0) {
    return `No tracked sharp picks on ${subj} (${winLabel}) yet.`;
  }

  // by_capper is sorted units-desc by the backend. Take top + bottom
  // when there's more than one capper; one line when there's just one.
  if (by_capper.length <= 1) {
    return head;
  }
  const best = by_capper[0];
  const worst = by_capper[by_capper.length - 1];
  const bestLine = best.handle
    ? `Best: @${best.handle} ${recordStr(best.wins, best.losses, best.pushes)} ${fmtUnits(best.units)}`
    : null;
  const worstLine =
    worst.capper_id !== best.capper_id && worst.handle
      ? `Worst: @${worst.handle} ${recordStr(worst.wins, worst.losses, worst.pushes)} ${fmtUnits(worst.units)}`
      : null;
  return [head, bestLine, worstLine].filter(Boolean).join("\n");
}
