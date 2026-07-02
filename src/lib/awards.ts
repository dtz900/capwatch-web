/**
 * Monthly award registry. Awards are issued once and frozen: the numbers on a
 * card are the capper's record over the award month (game_date, ET) as graded
 * at issuance time, and they do not drift with later regrades. That permanence
 * is the point of the card, so entries are committed data, not a live query.
 *
 * Issuance (monthly):
 * - straights: /api/public/cappers/{h}?start=YYYY-MM-01&end=YYYY-MM-31&bet_type=straights
 *   -> range_aggregate, rank by units_profit
 * - ml: same call -> range_aggregate.market_slices.ML (min 20 picks floor);
 *   W-L-P counted from the market-filtered history
 * - parlays: same call with bet_type=parlays (sanity-check for single-hit
 *   distortion before issuing)
 */

export type AwardCategory = "straights" | "ml" | "parlays";

export interface AwardCategoryMeta {
  /** Card headline after the rank, e.g. "#1 Moneyline Capper" */
  headline: string;
  /** Short label used in page copy */
  label: string;
  /** Uppercase footnote line on the card */
  footnote: string;
  /** Query params for the verify-the-record profile link */
  verifyParams: Record<string, string>;
}

export const AWARD_CATEGORIES: Record<AwardCategory, AwardCategoryMeta> = {
  straights: {
    headline: "MLB Capper",
    label: "straight bets",
    footnote: "Straight bets only · Every pick graded from the original tweet",
    verifyParams: { bet_type: "straights" },
  },
  ml: {
    headline: "Moneyline Capper",
    label: "moneyline straight bets",
    footnote: "Moneyline straights only · Every pick graded from the original tweet",
    verifyParams: { bet_type: "straights", market: "ml" },
  },
  parlays: {
    headline: "Parlay Capper",
    label: "parlays",
    footnote: "Parlays only · Every slip graded from the original tweet",
    verifyParams: { bet_type: "parlays" },
  },
};

export interface MonthlyAward {
  slug: string;
  /** "YYYY-MM" */
  month: string;
  /** Display form, e.g. "June 2026" */
  monthLabel: string;
  category: AwardCategory;
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
  /** Cumulative profit_units over the award month (downsampled, frozen at
   * issuance). For ml awards this is the ML-only line built from graded
   * history, so it always ends at unitsProfit. */
  trajectory: number[];
}

export const MONTHLY_AWARDS: MonthlyAward[] = [
  // ---- June 2026 · straights (range_aggregate, issued 2026-07-01) ----
  {
    slug: "2026-06-straights-tonestakes",
    month: "2026-06",
    monthLabel: "June 2026",
    category: "straights",
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
    trajectory: [-1, -0.81, 4.92, 0.11, 7.64, 4.84, 12.03, 13.78, 9.78, 10.25, 11.89, 11.13, 11.72, 13.2, 12.23, 10.35, 13.64, 16.05, 15.27, 17.79, 22.41, 13.13, 15.99, 16.74, 22.49, 20.57, 25.47, 29.39, 27.52, 30.17, 25.42, 23.71, 20.72, 21, 19.31, 21.72, 24.97, 27.85, 28.05, 28.56, 29.71, 26.81, 27.42, 26.52, 35.75, 40.5, 38, 38.4],
  },
  {
    slug: "2026-06-straights-robdfb",
    month: "2026-06",
    monthLabel: "June 2026",
    category: "straights",
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
    trajectory: [-1, -4.41, -0.68, 9.3, 8.91, -1.48, 0.54, 4.17, -6.87, 11.36, 5.08, -2.43, -5.12, 2.47, 9.09, 28.36, 20.47, 31.37, 34.12, 34.33, 17.82, 9.88, 17.85, 2.59, -4.29, -5.21, -8.02, -6.14, -5.6, -2.77, 11.14, 18.45, 24.53, 28.18, 27.59, 23.56, 37.42, 29.21, 22.22, 28.1, 36.21, 39.05, 26.96, 32.85, 31.18, 30.03, 27.06, 33.31],
  },
  {
    slug: "2026-06-straights-bluefirepicks",
    month: "2026-06",
    monthLabel: "June 2026",
    category: "straights",
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
    trajectory: [1, 1.08, -1.92, 0.09, -1.91, -0.04, -1.17, -1.12, -1.21, -1.26, -4.26, -4.37, -2.19, -3.35, -3.4, -2.47, -0.62, -3.62, -1.75, -1.99, -0.7, -0.9, -2.9, -4.9, -4.14, -4.31, -1.73, -0.14, 0.61, 2.53, 2.69, 5.24, 3.24, 4.92, 6.07, 4.07, 5.85, 7.74, 6.88, 6.79, 8.73, 8.6, 11.2, 11.11, 10.95, 10.82, 13.85, 16.06],
  },
  // ---- June 2026 · moneyline (market_slices.ML, min 20 picks; issued 2026-07-01) ----
  {
    slug: "2026-06-ml-swampy_swami",
    month: "2026-06",
    monthLabel: "June 2026",
    category: "ml",
    rank: 1,
    handle: "swampy_swami",
    displayName: "SWAMPTHING",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/378800000465143752/59deee4074051f6168c2c3b4c28d6cbd.jpeg",
    unitsProfit: 10.36,
    wins: 68,
    losses: 59,
    pushes: 0,
    winRate: 0.5354,
    roiPct: 8.2,
    picksCount: 127,
    issuedAt: "2026-07-01",
    trajectory: [-1, -4, -2.11, -3.04, -4.37, -3.44, -3.23, -1.82, 2.17, 3.74, 4.99, 5.03, 3.03, 3.86, 0.86, 1.72, 4.26, 7.59, 10.14, 12.57, 13.26, 13.86, 13.92, 14.82, 13.72, 12.94, 12.62, 11.61, 10.32, 13.57, 14.59, 15.16, 13.16, 12.14, 13.2, 12.42, 14.59, 15.96, 17.14, 19.13, 19.99, 19.26, 19.18, 19.79, 18.36, 15.36, 13.36, 10.36],
  },
  {
    slug: "2026-06-ml-sbr_bets",
    month: "2026-06",
    monthLabel: "June 2026",
    category: "ml",
    rank: 2,
    handle: "sbr_bets",
    displayName: "SBR",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/2057174598811025408/Tfi7Ozfn.jpg",
    unitsProfit: 9.71,
    wins: 19,
    losses: 9,
    pushes: 0,
    winRate: 0.6786,
    roiPct: 32.7,
    picksCount: 28,
    issuedAt: "2026-07-01",
    trajectory: [1, 2, 3, 4, 5, 4.13, 5.13, 6.13, 7.13, 6.13, 7.13, 8.13, 9.13, 8.13, 9.13, 8.36, 9.36, 8.36, 9.36, 8.51, 7.31, 8.31, 6.91, 7.91, 8.91, 9.91, 8.71, 9.71],
  },
  {
    slug: "2026-06-ml-studyhallsharp",
    month: "2026-06",
    monthLabel: "June 2026",
    category: "ml",
    rank: 3,
    handle: "studyhallsharp",
    displayName: "Study Hall Sharp",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/1955467285650345986/H1VLTUCK.jpg",
    unitsProfit: 9.07,
    wins: 23,
    losses: 10,
    pushes: 0,
    winRate: 0.697,
    roiPct: 25.2,
    picksCount: 33,
    issuedAt: "2026-07-01",
    trajectory: [1, 0, 0.89, -0.11, 0.79, -0.21, 0.41, 0.92, 1.57, 2.31, 3.8, 5.05, 5.61, 6.41, 7.1, 5.1, 4.1, 5.01, 6.17, 5.17, 4.17, 4.88, 5.55, 4.55, 3.55, 4.37, 5.58, 6.3, 5.3, 6.65, 6.65, 7.9, 8.47, 9.07],
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

export function awardVerifyHref(award: MonthlyAward): string {
  const range = awardMonthRange(award);
  const params = new URLSearchParams({
    start: range.start,
    end: range.end,
    ...AWARD_CATEGORIES[award.category].verifyParams,
  });
  return `/cappers/${award.handle}?${params.toString()}`;
}
