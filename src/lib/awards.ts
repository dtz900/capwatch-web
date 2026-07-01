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
