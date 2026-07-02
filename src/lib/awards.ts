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

/** Bump on award-card design changes; busts the page inline image and OG URL
 * past the CDN's long cache (see the OG Card Caching lesson). */
export const AWARD_CARD_VERSION = "8";

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
    trajectory: [-1, 0, 1.14, -0.1, -1.1, -2.1, -0.95, -1.95, -0.81, -1.81, -0.66, 0.34, 1.34, 2.34, 3.89, 2.82, 3.82, 4.92, 3.92, 2.92, 1.92, 0.92, 0.92, -0.08, 1.25, 0.11, 1.11, 2.61, 4.01, 5.19, 6.29, 7.64, 8.64, 7.64, 6.59, 5.54, 6.79, 7.89, 8.89, 7.89, 6.89, 5.84, 4.84, 3.84, 4.84, 6.08, 7.08, 8.08, 9.68, 10.83, 12.03, 13.08, 14.18, 15.53, 14.53, 15.78, 14.78, 13.78, 14.78, 13.78, 12.78, 11.78, 10.78, 11.88, 12.88, 11.88, 10.88, 9.78, 8.78, 7.78, 8.78, 10.08, 9.08, 10.25, 9.25, 10.25, 9.25, 8.25, 9.39, 10.39, 11.74, 12.74, 13.89, 12.89, 11.89, 12.94, 11.94, 10.77, 12.12, 12.12, 10.97, 9.97, 11.13, 12.13, 11.13, 10.13, 11.22, 12.78, 11.65, 12.72, 11.72, 12.87, 14.07, 12.99, 14.14, 13.1, 12.1, 13.2, 12.2, 13.2, 12.2, 11.2, 11.2, 12.26, 13.38, 14.48, 13.23, 12.23, 11.23, 12.23, 11.23, 12.45, 11.45, 10.45, 11.35, 10.35, 11.5, 12.35, 11.35, 10.05, 9.05, 10.05, 11.25, 12.64, 13.64, 14.94, 13.74, 12.74, 13.74, 12.74, 13.88, 15.05, 16.05, 15.05, 14.05, 15.17, 16.23, 14.98, 16.15, 15.15, 14.15, 15.27, 14.27, 15.36, 14.36, 15.56, 14.56, 15.64, 16.66, 17.79, 19.09, 19.92, 21.05, 22.25, 23.39, 22.39, 23.59, 22.41, 21.41, 20.39, 19.39, 18.39, 17.35, 16.35, 15.35, 14.35, 13.13, 12.13, 10.95, 12.35, 11.35, 12.35, 13.64, 14.64, 15.99, 14.99, 16.14, 15.14, 16.64, 17.64, 16.64, 15.64, 16.74, 17.74, 18.99, 20.24, 19.24, 20.34, 19.14, 20.29, 21.49, 22.49, 21.49, 20.49, 19.32, 20.32, 19.32, 18.32, 19.32, 20.57, 19.57, 20.65, 22.15, 23.25, 24.25, 25.38, 26.52, 25.47, 26.72, 25.72, 26.72, 27.88, 28.88, 30.31, 29.31, 28.26, 29.39, 30.45, 29.2, 28.2, 27.2, 26.2, 27.52, 26.52, 27.52, 28.97, 30.12, 31.12, 32.42, 31.42, 30.17, 31.17, 30.17, 31.47, 30.47, 29.32, 28.32, 27.32, 26.32, 27.42, 26.42, 25.42, 26.42, 27.57, 26.57, 25.57, 24.57, 23.57, 24.71, 23.71, 22.71, 21.53, 20.53, 21.63, 22.78, 23.78, 22.78, 21.72, 20.72, 21.89, 22.89, 21.89, 20.89, 19.89, 21, 20, 21, 20, 19, 18, 19.23, 20.33, 21.33, 20.33, 19.31, 18.31, 17.31, 18.91, 17.91, 19.36, 20.51, 21.51, 20.51, 21.72, 20.72, 19.72, 20.97, 19.97, 21.22, 22.47, 23.87, 24.97, 26.15, 27.17, 26.17, 25.17, 26.32, 25.3, 26.55, 27.85, 28.85, 27.85, 29.15, 28.15, 27.15, 28.65, 27.65, 29.05, 28.05, 27.05, 28.05, 27.05, 28.4, 27.4, 26.2, 27.36, 28.56, 27.46, 26.46, 27.61, 26.61, 27.61, 29.16, 28.16, 29.71, 28.71, 29.81, 30.85, 29.85, 28.85, 29.85, 28.85, 27.85, 26.81, 25.81, 24.81, 25.81, 27.12, 26.12, 25.12, 26.12, 27.42, 26.42, 27.42, 28.72, 29.72, 28.72, 27.72, 28.72, 27.72, 26.52, 27.75, 29.1, 30.1, 31.3, 32.34, 33.54, 34.59, 35.75, 34.75, 36.2, 37.2, 38.2, 37.2, 38.3, 39.3, 40.5, 42, 43, 42, 41, 40, 39, 39, 38, 38, 39.15, 38.15, 37.15, 36.15, 37.15, 36.15, 37.15, 38.4],
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
    trajectory: [-1, -4, -6, -2.49, -3.49, -7.49, -5.82, -2.91, -4.41, -6.41, -4.79, -2.29, -5.29, -3.63, -0.77, 3.32, -0.68, -2.68, -0.07, 3.83, 7.34, 3.34, 1.84, 3.37, 7.15, 9.3, 13.35, 10.35, 9.35, 11.01, 9.01, 14.41, 12.91, 8.91, 5.91, 4.91, 1.91, -0.09, 1.67, -1.33, -3.33, -1.48, 2, 5, -0, 2.54, 1.54, -2.46, -1.06, 0.54, -2.46, -6.46, -1.98, -3.98, -3.98, -1.58, 1.01, 0.01, 4.17, 2.17, 6.13, 4.13, 2.13, 1.13, -2.87, -3.87, -6.87, -3.91, -8.91, -3.96, 2.42, 4.23, 7.18, 12.86, 11.36, 6.36, 10.16, 8.16, 4.16, 6.47, 9.08, 6.08, 5.08, 1.08, 2.82, -1.18, 2.15, -0.85, -3.85, -4.85, -6.85, -2.43, -6.43, -7.93, -8.93, -8.93, -5.76, -2.12, -3.12, -5.12, -5.12, -8.12, -9.12, -4.12, -1.32, 0.98, 6.47, 2.47, 1.47, 6.5, 9.3, 7.3, 3.3, 7.01, 4.01, 9.09, 5.09, 2.09, 7.31, 11.56, 25.06, 24.06, 26.36, 29.36, 28.36, 31.69, 29.69, 25.19, 23.69, 25.51, 20.51, 23.47, 20.47, 19.47, 18.47, 14.47, 16.93, 15.93, 20.57, 28.87, 31.37, 29.37, 27.37, 30.91, 26.91, 24.91, 28.48, 30.24, 34.12, 32.62, 29.62, 26.62, 30.66, 29.66, 27.66, 31.13, 34.33, 30.33, 29.33, 24.33, 21.33, 23.43, 19.43, 22.82, 18.82, 17.82, 13.32, 11.82, 13.52, 15.42, 11.42, 11.42, 7.42, 9.88, 14.28, 13.28, 16.01, 19.49, 17.49, 21.85, 20.85, 17.85, 19.59, 19.59, 19.59, 15.59, 13.59, 10.59, 6.59, 2.59, 4.13, 6.49, 8.71, 4.71, -0.29, 2.71, 1.71, 0.21, -4.29, -1.29, -3.29, -0.21, 4.79, 3.79, -0.71, -2.21, -5.21, -7.21, -11.21, -8.35, -3.35, -5.35, -8.35, -11.35, -8.02, -6.35, -10.35, -5.75, -8.75, -7.04, -1.64, -5.14, -6.14, -1.74, -4.74, -2.93, -6.93, -9.93, -10.93, -7.44, -8.94, -5.6, -3.87, -1.32, 4.53, 3.03, -0.97, -3.97, -5.97, -2.77, -4.77, -1.2, 0.86, -3.14, -0.28, 2.04, 8.29, 11.14, 16.54, 15.04, 16.97, 18.5, 15.5, 14.5, 19.45, 18.45, 16.45, 14.95, 20.62, 18.62, 21.83, 26.03, 28.53, 24.53, 19.53, 17.53, 15.53, 20.17, 23.32, 19.32, 23.03, 25.57, 28.18, 30.14, 28.14, 33.09, 31.59, 34.09, 32.59, 31.59, 27.59, 23.09, 19.09, 20.83, 24.64, 26.3, 22.3, 21.3, 23.56, 20.56, 22.05, 22.05, 25.5, 24.5, 27.22, 32.62, 37.42, 32.42, 34.18, 30.18, 33.03, 31.04, 28.04, 29.64, 33.21, 29.21, 26.21, 21.21, 17.21, 20.81, 20.81, 24.41, 26.22, 22.22, 24.77, 28.07, 24.07, 27.85, 24.85, 22.85, 29.6, 28.1, 24.1, 29.7, 33.7, 36.87, 39.81, 42.21, 37.71, 36.21, 31.71, 30.71, 32.53, 36.37, 34.87, 40.27, 43.05, 41.05, 39.05, 42.53, 39.53, 35.53, 32.53, 29.53, 27.53, 25.53, 26.96, 31.64, 30.14, 27.14, 29.3, 30.9, 33.65, 37.35, 32.85, 31.35, 28.35, 24.35, 25.83, 25.83, 24.83, 27.91, 31.18, 27.18, 26.18, 25.18, 21.18, 25.38, 24.38, 28.33, 26.83, 30.03, 27.03, 31.55, 36.55, 40.06, 38.06, 35.06, 30.06, 27.06, 22.56, 21.06, 19.06, 23.26, 24.93, 27.07, 29.47, 33.31],
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
    trajectory: [1, 2.08, 1.08, 0.08, -0.92, -1.92, -1.1, 0.09, -0.91, -1.91, -1.09, -0.04, -1.04, -0.17, -1.17, -2.17, -1.12, -0.21, -1.21, -2.21, -1.26, -2.26, -3.26, -4.26, -5.26, -4.37, -3.59, -2.19, -3.19, -4.19, -3.35, -2.4, -3.4, -2.47, -2.47, -1.63, -0.62, -1.62, -2.62, -3.62, -2.62, -1.75, -0.99, -1.99, -0.58, -1.58, -0.7, -1.7, -0.9, -1.9, -2.9, -3.9, -4.9, -4.02, -5.02, -4.14, -5.14, -4.31, -2.69, -1.73, -0.98, -0.14, 0.74, 1.61, 0.61, 1.56, 2.53, 3.69, 2.69, 3.44, 4.44, 5.24, 4.24, 3.24, 4.05, 4.92, 4.92, 6.07, 5.07, 5.07, 4.07, 5, 5.85, 6.8, 7.74, 6.74, 7.88, 6.88, 7.79, 6.79, 7.77, 8.73, 7.73, 8.6, 8.6, 10.33, 11.2, 10.2, 11.11, 10.11, 10.95, 9.95, 10.82, 12.11, 12.93, 13.85, 15.05, 16.06],
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
    trajectory: [-1, -2, -3, -4, -3.17, -2.11, -3.11, -2.04, -3.04, -4.04, -3.37, -4.37, -5.37, -4.09, -3.44, -2.23, -3.23, -2.07, -0.82, -1.82, -0.12, 0.92, 2.17, 3.04, 3.74, 2.74, 3.88, 4.99, 3.99, 3.99, 5.03, 4.03, 3.03, 3.72, 2.72, 3.86, 2.86, 1.86, 0.86, 1.8, 2.72, 1.72, 2.36, 4.26, 5.15, 6.24, 7.59, 8.33, 9.23, 10.14, 11.42, 12.57, 13.45, 12.45, 13.26, 12.26, 13.14, 13.86, 12.86, 13.92, 15.05, 15.82, 14.82, 15.72, 14.72, 13.72, 12.72, 13.94, 12.94, 11.94, 12.62, 11.62, 12.61, 11.61, 10.61, 9.61, 10.32, 12.07, 13.57, 12.57, 13.8, 14.59, 15.31, 14.31, 15.16, 14.16, 13.16, 12.16, 11.16, 12.14, 13.06, 14.2, 13.2, 12.2, 11.2, 12.42, 13.7, 14.59, 16.24, 16.96, 15.96, 16.86, 15.86, 17.14, 17.93, 19.13, 20.1, 20.99, 19.99, 18.99, 20.26, 19.26, 18.26, 19.18, 19.89, 20.79, 19.79, 18.79, 19.36, 18.36, 17.36, 16.36, 15.36, 14.36, 13.36, 12.36, 11.36, 10.36],
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
