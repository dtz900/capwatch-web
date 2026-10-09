import { warnFailed, warnIfSlow } from "./upstream-log";
/**
 * MLB postseason rounds for the slate's standings rollup.
 *
 * During the postseason the Mon-Sun "This week" board is replaced by the
 * current round: Wild Card Series, then Division Series, Championship
 * Series and World Series. A round's board stays up from its first game
 * until the next round's first game (David, 2026-10-01: "leave this
 * leaderboard up until the divisional series starts then change the
 * name"). Round dates come from MLB's postseason schedule, so the
 * unplayed "if necessary" games drop off on their own once a series ends.
 */

export interface PostseasonRound {
  gameType: string;
  label: string;
  start: string;
  end: string;
}

interface ScheduleGame {
  gameType?: string;
  officialDate?: string;
  status?: { detailedState?: string };
}

const ROUNDS: { gameType: string; label: string }[] = [
  { gameType: "F", label: "Wild Card Series" },
  { gameType: "D", label: "Division Series" },
  { gameType: "L", label: "Championship Series" },
  { gameType: "W", label: "World Series" },
];

/** Rounds in bracket order, each spanning its first to last scheduled
 * game date. Cancelled games are ignored; rounds with no games yet are
 * omitted. */
export function roundsFromSchedule(games: ScheduleGame[]): PostseasonRound[] {
  const out: PostseasonRound[] = [];
  for (const { gameType, label } of ROUNDS) {
    const dates = games
      .filter((g) => g.gameType === gameType && g.officialDate)
      .filter((g) => !/cancel/i.test(g.status?.detailedState ?? ""))
      .map((g) => g.officialDate as string)
      .sort();
    if (dates.length === 0) continue;
    out.push({ gameType, label, start: dates[0], end: dates[dates.length - 1] });
  }
  return out;
}

/** The round whose board is up on slate date `dateIso`: the latest round
 * that has started by then. Null before the first postseason game. */
export function activeRound(rounds: PostseasonRound[], dateIso: string): PostseasonRound | null {
  let active: PostseasonRound | null = null;
  for (const r of rounds) {
    if (r.start <= dateIso) active = r;
  }
  return active;
}

const DAY_MS = 86_400_000;

/** Round days worth fetching: its first game through whichever comes
 * first of its last game and today's slate day. */
export function roundDaysToFetch(round: PostseasonRound, todaySlateDay: string): string[] {
  const last = round.end < todaySlateDay ? round.end : todaySlateDay;
  if (round.start > last) return [];
  const out: string[] = [];
  const end = new Date(`${last}T00:00:00Z`).getTime();
  for (let t = new Date(`${round.start}T00:00:00Z`).getTime(); t <= end; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

const SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule/postseason";

const SCHEDULE_TIMEOUT_MS = 4_000;

/** MLB's postseason schedule for `season`, flattened to games. Bounded so a
 * stalled StatsAPI degrades to the Mon-Sun board instead of holding the
 * slate render to the function ceiling (Codex P1 on #168). */
export async function fetchPostseasonGames(season: number): Promise<ScheduleGame[]> {
  const url = `${SCHEDULE_URL}?season=${season}&fields=dates,games,gameType,officialDate,status,detailedState`;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), SCHEDULE_TIMEOUT_MS);
  let res: Response;
  let text: string;
  const started = Date.now();
  try {
    res = await fetch(url, { next: { revalidate: 900 }, signal: ctrl.signal });
    // Read the body before clearing the timer so a stalled body is bounded too.
    text = await res.text();
    warnIfSlow("mlb-schedule", url, started, res.status);
  } catch (err) {
    warnFailed("mlb-schedule", url, started, err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) throw new Error(`postseason schedule ${res.status}`);
  const body = JSON.parse(text) as { dates?: { games?: ScheduleGame[] }[] };
  return (body.dates ?? []).flatMap((d) => d.games ?? []);
}
