/**
 * Final leaderboard archives. Each entry is a week (NFL) or day (MLB) board
 * exactly as it stood when it was issued, ranked by net units. Numbers do
 * not drift with later regrades; the live, still-mutable view is one click
 * away via `liveHref`.
 *
 * Issuance: D:/EA/projects/tailslips/leaderboard-archives/archive.py writes
 * src/data/leaderboard-archives/<slug>.json from the public slate (it refuses
 * while anything is pending). Add one import below and ship.
 */
import nfl_2026_week_1 from "@/data/leaderboard-archives/nfl-2026-week-1.json";
import mlb_2026_09_14 from "@/data/leaderboard-archives/mlb-2026-09-14.json";

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
  /** ISO slate date for a day board; null for a week board */
  dateIso: string | null;
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
  mlb_2026_09_14 as LeaderboardArchive,
];

export function getArchive(slug: string): LeaderboardArchive | undefined {
  return LEADERBOARD_ARCHIVES.find((a) => a.slug === slug);
}
