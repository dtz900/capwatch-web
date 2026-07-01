/**
 * Monthly award registry. Awards are issued once and frozen: the numbers on a
 * card are the capper's straights record over the award month (game_date, ET)
 * as graded at issuance time, and they do not drift with later regrades. That
 * permanence is the point of the card, so entries are committed data, not a
 * live query.
 *
 * Issuance: pull the month's top straights records via
 * /api/public/cappers/{handle}?start=YYYY-MM-01&end=YYYY-MM-31&bet_type=straights
 * (range_aggregate), rank by units_profit, and append entries here.
 */

export interface MonthlyAward {
  slug: string;
  /** "YYYY-MM" */
  month: string;
  /** Display form, e.g. "June 2026" */
  monthLabel: string;
  rank: number;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  unitsProfit: number;
  wins: number;
  losses: number;
  pushes: number;
  /** Fraction 0..1 */
  winRate: number;
  roiPct: number;
  picksCount: number;
  /** ISO date the award was issued/frozen */
  issuedAt: string;
}

export const MONTHLY_AWARDS: MonthlyAward[] = [
  {
    slug: "2026-06-tonestakes",
    month: "2026-06",
    monthLabel: "June 2026",
    rank: 1,
    handle: "tonestakes",
    displayName: "TonesTakes",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/1381440333335175169/WtNUFAKq.jpg",
    unitsProfit: 38.4,
    wins: 201,
    losses: 188,
    pushes: 5,
    winRate: 0.5167,
    roiPct: 9.4,
    picksCount: 394,
    issuedAt: "2026-07-01",
  },
  {
    slug: "2026-06-robdfb",
    month: "2026-06",
    monthLabel: "June 2026",
    rank: 2,
    handle: "robdfb",
    displayName: "Rob Donaldson",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/1624902227880992768/yq8lewSU.jpg",
    unitsProfit: 33.31,
    wins: 174,
    losses: 205,
    pushes: 9,
    winRate: 0.4591,
    roiPct: 3.0,
    picksCount: 388,
    issuedAt: "2026-07-01",
  },
  {
    slug: "2026-06-bluefirepicks",
    month: "2026-06",
    monthLabel: "June 2026",
    rank: 3,
    handle: "bluefirepicks",
    displayName: "BFP",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/2044434054502928384/shGYKFki.jpg",
    unitsProfit: 16.06,
    wins: 61,
    losses: 43,
    pushes: 4,
    winRate: 0.5865,
    roiPct: 14.9,
    picksCount: 108,
    issuedAt: "2026-07-01",
  },
];

export function getAward(slug: string): MonthlyAward | null {
  return MONTHLY_AWARDS.find((a) => a.slug === slug) ?? null;
}

/** Month range for the verify link, e.g. { start: "2026-06-01", end: "2026-06-30" }. */
export function awardMonthRange(award: MonthlyAward): { start: string; end: string } {
  const [y, m] = award.month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { start: `${award.month}-01`, end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

export function ordinalRank(rank: number): string {
  return `#${rank}`;
}
