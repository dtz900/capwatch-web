import type {
  ResearchCut,
  ResearchResponse,
  ResearchStatRow,
  ResearchTotals,
  ResearchWindow,
  TeamCut,
} from "@/lib/api";

const WINDOW_LABEL: Record<ResearchWindow, string> = {
  L7: "L7",
  L30: "L30",
  season: "this season",
  all: "all-time",
};

/** Per-cut phrasing used in the snippet headline. Reads naturally when
 * dropped after the subject: "Tracked sharps backing the Astros ...". */
const CUT_PHRASE: Record<TeamCut, string> = {
  backing: "backing",
  fading: "fading",
  totals_over: "on Over totals for",
  totals_under: "on Under totals for",
  team_total: "on team totals for",
  unknown: "on bets involving",
};

/** Short cut label used when listing multiple cuts together. */
const CUT_SHORT: Record<TeamCut, string> = {
  backing: "Backing",
  fading: "Fading",
  totals_over: "Game Overs",
  totals_under: "Game Unders",
  team_total: "Team totals",
  unknown: "Other",
};

function recordStr(wins: number, losses: number, pushes: number): string {
  return pushes > 0 ? `${wins}-${losses}-${pushes}` : `${wins}-${losses}`;
}

function rateStr(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function rateClause(row: ResearchTotals): string {
  const decided = row.picks - row.pushes;
  if (decided < 3) return "";
  return ` (${rateStr(row.win_rate)})`;
}

export function buildPlayerSnippet(r: ResearchResponse): string {
  const { subject, totals, by_stat, window } = r;
  const w = WINDOW_LABEL[window];
  if (totals.picks === 0) return `No tracked sharp picks on ${subject} ${w} yet.`;
  const head = `Tracked sharps on ${subject} ${w}: ${recordStr(totals.wins, totals.losses, totals.pushes)}${rateClause(totals)}.`;

  const meaningful = by_stat.filter((s) => s.picks - s.pushes >= 3);
  if (meaningful.length === 0) return head;

  const lines = meaningful.slice(0, 3).map(statLine);
  return [head, ...lines].join("\n");
}

function statLine(s: ResearchStatRow): string {
  const head = `${s.label}: ${recordStr(s.wins, s.losses, s.pushes)}${rateClause(s)}`;
  // When both directions have meaningful sample, add a "(Overs X-Y, Unders A-B)"
  // sub-clause so the reader sees the split that's usually the real story.
  const over = s.directions.find((d) => d.direction === "over");
  const under = s.directions.find((d) => d.direction === "under");
  const meaningfulOver = over && over.picks - over.pushes >= 3;
  const meaningfulUnder = under && under.picks - under.pushes >= 3;
  if (meaningfulOver && meaningfulUnder) {
    return `${head} (Overs ${recordStr(over.wins, over.losses, over.pushes)}, Unders ${recordStr(under.wins, under.losses, under.pushes)})`;
  }
  return head;
}

export function buildPlayerStatSnippet(
  r: ResearchResponse,
  stat: ResearchStatRow,
): string {
  const { subject, window } = r;
  const w = WINDOW_LABEL[window];
  const head = `Tracked sharps on ${subject} ${stat.label.toLowerCase()} ${w}: ${recordStr(stat.wins, stat.losses, stat.pushes)}${rateClause(stat)}.`;
  const over = stat.directions.find((d) => d.direction === "over");
  const under = stat.directions.find((d) => d.direction === "under");
  const subs: string[] = [];
  if (over && over.picks - over.pushes >= 3) {
    subs.push(`Overs: ${recordStr(over.wins, over.losses, over.pushes)}${rateClause(over)}`);
  }
  if (under && under.picks - under.pushes >= 3) {
    subs.push(`Unders: ${recordStr(under.wins, under.losses, under.pushes)}${rateClause(under)}`);
  }
  return subs.length ? [head, ...subs].join("\n") : head;
}

export function buildTeamCutSnippet(r: ResearchResponse, cut: ResearchCut): string {
  const { subject, window } = r;
  const w = WINDOW_LABEL[window];
  const phrase = CUT_PHRASE[cut.cut];
  return `Tracked sharps ${phrase} ${subject} ${w}: ${recordStr(cut.wins, cut.losses, cut.pushes)}${rateClause(cut)}.`;
}

export function buildTeamSummarySnippet(r: ResearchResponse): string {
  const { subject, window, cuts, totals, resolved_abbrev } = r;
  const w = WINDOW_LABEL[window];
  if (totals.picks === 0) {
    return `No tracked sharp picks involving ${subject} ${w} yet.`;
  }
  // Unresolved team. No cuts to list; just dump the combined record.
  if (!resolved_abbrev || cuts.length === 0) {
    return `Tracked sharps on bets involving ${subject} ${w}: ${recordStr(totals.wins, totals.losses, totals.pushes)}${rateClause(totals)}.`;
  }

  const head = `Tracked sharps on ${subject} ${w}:`;
  const lines = cuts
    .filter((c) => c.picks - c.pushes >= 3)
    .map((c) => `${CUT_SHORT[c.cut]}: ${recordStr(c.wins, c.losses, c.pushes)}${rateClause(c)}`);
  if (lines.length === 0) {
    // No cut had enough decided sample; fall back to a single combined line.
    return `Tracked sharps on bets involving ${subject} ${w}: ${recordStr(totals.wins, totals.losses, totals.pushes)}${rateClause(totals)}.`;
  }
  return [head, ...lines].join("\n");
}

/** Backwards-compatible entrypoint kept around so existing callers compile;
 * routes to the right builder based on mode. */
export function buildSnippet(r: ResearchResponse): string {
  return r.mode === "team" ? buildTeamSummarySnippet(r) : buildPlayerSnippet(r);
}
