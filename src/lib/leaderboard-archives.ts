/**
 * Final leaderboard archives. Each entry is a week (NFL) or day (MLB) board
 * exactly as it stood when it was issued, ranked by net units. Numbers do
 * not drift with later regrades; the live, still-mutable view is one click
 * away via `liveHref`.
 *
 * Issuance: D:/EA/projects/tailslips/leaderboard-archives/archive.py writes
 * src/data/leaderboard-archives/<slug>.json from the public slate (it refuses
 * while anything is pending). Add one import below and ship. NFL boards are
 * league weeks; MLB boards are Mon-Sun weeks (day boards are no longer issued).
 */
import nfl_2026_week_1 from "@/data/leaderboard-archives/nfl-2026-week-1.json";
import mlb_2026_09_14 from "@/data/leaderboard-archives/mlb-2026-09-14.json";
import mlb_2026_week_of_sep_7 from "@/data/leaderboard-archives/mlb-2026-week-of-sep-7.json";

export interface ArchiveRow {
  rank: number;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  wins: number;
  losses: number;
  pushes: number;
  voids: number;
  graded: number;
  netUnits: number;
  /** Picks (or parlay tickets) that graded W/L with zero units because no
   * price was posted and no Pinnacle line matched. */
  unpriced: number;
}

export interface LeaderboardArchive {
  slug: string;
  sport: "nfl" | "mlb";
  /** e.g. "NFL Week 1" or "MLB Sep 14" */
  title: string;
  /** e.g. "Sep 9 to 14, 2026" or "September 14, 2026" */
  rangeLabel: string;
  season: number;
  /** NFL week number; null for a day board */
  week: number | null;
  /** ISO slate date for a day board, or the Monday of an MLB week; null for an NFL week */
  dateIso: string | null;
  /** ISO Sunday of an MLB week board (MLB archives are weekly; day boards are
   * no longer issued). Absent for NFL weeks and for the legacy day board. */
  weekEnd?: string | null;
  /** Kept resolvable because a tweet linked it, but left off the index and
   * the prev/next nav. */
  unlisted?: boolean;
  /** ISO date the board became final */
  frozenAt: string;
  games: number;
  totals: {
    graded: number;
    wins: number;
    losses: number;
    pushes: number;
    voids: number;
    netUnits: number;
    /** Sum of ArchiveRow.unpriced across the board */
    unpriced: number;
  };
  liveHref: string;
  rows: ArchiveRow[];
}

export const LEADERBOARD_ARCHIVES: LeaderboardArchive[] = [
  nfl_2026_week_1 as LeaderboardArchive,
  mlb_2026_week_of_sep_7 as LeaderboardArchive,
  mlb_2026_09_14 as LeaderboardArchive,
];

export const LISTED_ARCHIVES: LeaderboardArchive[] = LEADERBOARD_ARCHIVES.filter((a) => !a.unlisted);

/** Human label for the board's span: "Week 1", "Sep 8 to 14", or "Sep 14". */
export function archiveSpanLabel(a: LeaderboardArchive, short: (iso: string) => string): string {
  if (a.week != null) return `Week ${a.week}`;
  if (a.dateIso && a.weekEnd) return `${short(a.dateIso)} to ${short(a.weekEnd)}`;
  return short(a.dateIso ?? a.frozenAt);
}

export function getArchive(slug: string): LeaderboardArchive | undefined {
  return LEADERBOARD_ARCHIVES.find((a) => a.slug === slug);
}
