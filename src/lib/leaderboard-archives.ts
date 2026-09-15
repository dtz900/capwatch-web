/**
 * Frozen leaderboard archives. Each entry is a week (NFL) or day (MLB) board
 * exactly as it stood when it was archived, ranked by net units. Numbers do
 * not drift with later regrades; that permanence is the point of the link.
 * The live, still-mutable view is always one click away via `liveHref`.
 *
 * Issuance: GET /api/public/slate?sport=nfl&week=N once the week is final
 * (day_summary.pending_count === 0), keep capper_summary rows with
 * graded_count > 0, sort by net_units desc, wins desc, handle.
 */

export interface ArchiveRow {
  rank: number;
  handle: string;
  displayName: string | null;
  wins: number;
  losses: number;
  pushes: number;
  voids: number;
  graded: number;
  netUnits: number;
}

export interface LeaderboardArchive {
  slug: string;
  sport: "nfl" | "mlb";
  /** e.g. "NFL Week 1" */
  title: string;
  /** e.g. "Sep 9 to 14, 2026" */
  rangeLabel: string;
  season: number;
  week: number | null;
  /** ISO date the board was frozen */
  frozenAt: string;
  games: number;
  totals: { graded: number; wins: number; losses: number; pushes: number; voids: number; netUnits: number };
  liveHref: string;
  rows: ArchiveRow[];
}

export const LEADERBOARD_ARCHIVES: LeaderboardArchive[] = [
  {
    slug: "nfl-2026-week-1",
    sport: "nfl",
    title: "NFL Week 1",
    rangeLabel: "Sep 9 to 14, 2026",
    season: 2026,
    week: 1,
    frozenAt: "2026-09-14",
    games: 16,
    totals: { graded: 1367, wins: 595, losses: 754, pushes: 11, voids: 7, netUnits: 6.75 },
    liveHref: "/slate?sport=nfl&week=1",
    rows: [
      { rank: 1, handle: "sbr_bets", displayName: "SBR", wins: 11, losses: 12, pushes: 0, voids: 0, graded: 23, netUnits: 73.72 },
      { rank: 2, handle: "b1gredbets", displayName: "#Red\ud83d\udea8", wins: 12, losses: 14, pushes: 0, voids: 0, graded: 26, netUnits: 16.99 },
      { rank: 3, handle: "blizzybets", displayName: "BlizzyBets\ud83e\udd76", wins: 1, losses: 3, pushes: 0, voids: 0, graded: 4, netUnits: 10.53 },
      { rank: 4, handle: "moneyline_mav", displayName: "MoneylineMav", wins: 14, losses: 8, pushes: 0, voids: 0, graded: 22, netUnits: 9.96 },
      { rank: 5, handle: "robdfb", displayName: "Rob Donaldson", wins: 6, losses: 4, pushes: 0, voids: 0, graded: 10, netUnits: 9.0 },
      { rank: 6, handle: "lottolocks", displayName: "Lotto Locks", wins: 3, losses: 31, pushes: 0, voids: 0, graded: 34, netUnits: 7.98 },
      { rank: 7, handle: "outoflinebets", displayName: "Out of Line Bets", wins: 2, losses: 6, pushes: 0, voids: 0, graded: 8, netUnits: 7.75 },
      { rank: 8, handle: "lincolng05bets", displayName: "Lincoln.", wins: 27, losses: 23, pushes: 0, voids: 0, graded: 50, netUnits: 7.58 },
      { rank: 9, handle: "asvpxhampicks", displayName: "Abe", wins: 7, losses: 4, pushes: 0, voids: 0, graded: 11, netUnits: 7.19 },
      { rank: 10, handle: "better___bett0r", displayName: "Better Bettor", wins: 5, losses: 2, pushes: 0, voids: 0, graded: 7, netUnits: 6.94 },
      { rank: 11, handle: "scottfosterlock", displayName: "Scott Foster\u2019s Sports Picks", wins: 14, losses: 9, pushes: 1, voids: 0, graded: 24, netUnits: 6.78 },
      { rank: 12, handle: "sps_birdman", displayName: "bird man \ud83d\udc26", wins: 1, losses: 1, pushes: 0, voids: 0, graded: 2, netUnits: 6.0 },
      { rank: 13, handle: "thebettingqueen", displayName: "thebettingqueen", wins: 3, losses: 6, pushes: 0, voids: 0, graded: 9, netUnits: 5.6 },
      { rank: 14, handle: "dai_bets", displayName: "DaiBets", wins: 6, losses: 2, pushes: 0, voids: 0, graded: 8, netUnits: 5.57 },
      { rank: 15, handle: "clvprophets", displayName: "CLVProphets", wins: 2, losses: 3, pushes: 1, voids: 0, graded: 6, netUnits: 5.18 },
      { rank: 16, handle: "max_picks", displayName: "MAXPicks", wins: 3, losses: 1, pushes: 0, voids: 0, graded: 4, netUnits: 5.13 },
      { rank: 17, handle: "tahoebettor", displayName: "Johnny Tahoe", wins: 7, losses: 3, pushes: 1, voids: 0, graded: 11, netUnits: 4.97 },
      { rank: 18, handle: "itsparlaypete", displayName: "Parlay Pete", wins: 6, losses: 4, pushes: 0, voids: 0, graded: 10, netUnits: 4.52 },
      { rank: 19, handle: "dommylocked", displayName: "Dommy", wins: 4, losses: 1, pushes: 0, voids: 0, graded: 5, netUnits: 4.21 },
      { rank: 20, handle: "bayouboysbets", displayName: "BayouBoysBets", wins: 9, losses: 7, pushes: 0, voids: 0, graded: 16, netUnits: 4.01 },
      { rank: 21, handle: "razorsinsight", displayName: "Razore", wins: 4, losses: 1, pushes: 0, voids: 0, graded: 5, netUnits: 3.93 },
      { rank: 22, handle: "moneyplayzz", displayName: "Moneyplayzz", wins: 7, losses: 3, pushes: 1, voids: 0, graded: 11, netUnits: 3.75 },
      { rank: 23, handle: "lineupswinning", displayName: "Winning Lineups", wins: 3, losses: 3, pushes: 0, voids: 0, graded: 6, netUnits: 3.57 },
      { rank: 24, handle: "sexualslips", displayName: "sexualslips", wins: 5, losses: 2, pushes: 1, voids: 0, graded: 8, netUnits: 3.37 },
      { rank: 25, handle: "lucksociety", displayName: "Luck Society", wins: 2, losses: 1, pushes: 0, voids: 0, graded: 3, netUnits: 3.15 },
      { rank: 26, handle: "a11bets", displayName: "A11 Bets", wins: 3, losses: 0, pushes: 0, voids: 0, graded: 3, netUnits: 2.4 },
      { rank: 27, handle: "degen__inc", displayName: "Crich \u2666\ufe0f", wins: 11, losses: 8, pushes: 0, voids: 0, graded: 19, netUnits: 2.35 },
      { rank: 28, handle: "pocketparlay", displayName: "Pocket Parlay", wins: 8, losses: 5, pushes: 0, voids: 0, graded: 13, netUnits: 2.23 },
      { rank: 29, handle: "ibetpeterv", displayName: "Peter V", wins: 6, losses: 5, pushes: 0, voids: 0, graded: 11, netUnits: 2.18 },
      { rank: 30, handle: "swampy_swami", displayName: "SWAMPTHING", wins: 15, losses: 26, pushes: 1, voids: 0, graded: 42, netUnits: 2.1 },
      { rank: 31, handle: "renzomoneyline", displayName: "R$", wins: 7, losses: 3, pushes: 0, voids: 0, graded: 10, netUnits: 1.87 },
      { rank: 32, handle: "joshuadasilva", displayName: "Josh", wins: 1, losses: 7, pushes: 0, voids: 0, graded: 8, netUnits: 1.79 },
      { rank: 33, handle: "goatcapital_", displayName: "GOAT Capital Sports", wins: 6, losses: 10, pushes: 0, voids: 0, graded: 16, netUnits: 1.73 },
      { rank: 34, handle: "thelineaudit", displayName: "TheLineAudit", wins: 7, losses: 5, pushes: 0, voids: 0, graded: 12, netUnits: 1.6 },
      { rank: 35, handle: "phillysharp1", displayName: "Philly Sharp", wins: 7, losses: 4, pushes: 0, voids: 0, graded: 11, netUnits: 1.54 },
      { rank: 36, handle: "smsports34", displayName: "Smart Money Sports", wins: 2, losses: 1, pushes: 0, voids: 0, graded: 3, netUnits: 1.28 },
      { rank: 37, handle: "showtimepicks2", displayName: "Showtime Picks", wins: 5, losses: 3, pushes: 1, voids: 0, graded: 9, netUnits: 1.19 },
      { rank: 38, handle: "cdlocklounge", displayName: "CDLockLounge", wins: 7, losses: 8, pushes: 0, voids: 0, graded: 15, netUnits: 0.94 },
      { rank: 39, handle: "antscovers", displayName: "AntsCovers", wins: 1, losses: 0, pushes: 0, voids: 0, graded: 1, netUnits: 0.93 },
      { rank: 40, handle: "Clutch_Betss", displayName: "Clutch Bets", wins: 3, losses: 2, pushes: 0, voids: 0, graded: 5, netUnits: 0.88 },
      { rank: 41, handle: "trupalocks", displayName: "TRUPA LOCKS", wins: 1, losses: 0, pushes: 0, voids: 0, graded: 1, netUnits: 0.84 },
      { rank: 42, handle: "kryptonprobett", displayName: "Krypton Pro Betting", wins: 1, losses: 1, pushes: 0, voids: 0, graded: 2, netUnits: 0.82 },
      { rank: 43, handle: "bettor_callpaul", displayName: "Bettor Call Paul", wins: 1, losses: 0, pushes: 0, voids: 0, graded: 1, netUnits: 0.77 },
      { rank: 44, handle: "cinematicc", displayName: "Alex", wins: 2, losses: 2, pushes: 0, voids: 0, graded: 4, netUnits: 0.67 },
      { rank: 45, handle: "franklincovers", displayName: "franklin", wins: 2, losses: 1, pushes: 0, voids: 0, graded: 3, netUnits: 0.63 },
      { rank: 46, handle: "thewageranalyst", displayName: "Wager Analyst", wins: 2, losses: 1, pushes: 0, voids: 0, graded: 3, netUnits: 0.6 },
      { rank: 47, handle: "yennysports", displayName: "Yenny Sports", wins: 7, losses: 6, pushes: 1, voids: 0, graded: 14, netUnits: 0.17 },
      { rank: 48, handle: "oddsdonny", displayName: "Odds Don", wins: 1, losses: 1, pushes: 0, voids: 0, graded: 2, netUnits: 0.09 },
      { rank: 49, handle: "lappylocks", displayName: "Lappy Locks", wins: 5, losses: 2, pushes: 0, voids: 0, graded: 7, netUnits: 0.0 },
      { rank: 50, handle: "plyrix_picks", displayName: "Plyrix Picks", wins: 3, losses: 1, pushes: 0, voids: 0, graded: 4, netUnits: 0.0 },
      { rank: 51, handle: "spreadwizard", displayName: "SpreadWizard", wins: 2, losses: 2, pushes: 0, voids: 0, graded: 4, netUnits: -0.14 },
      { rank: 52, handle: "skymoneysports", displayName: "Sky Money \ud83d\udcb0", wins: 2, losses: 2, pushes: 0, voids: 0, graded: 4, netUnits: -0.19 },
      { rank: 53, handle: "berts__bets", displayName: "BertsBets", wins: 3, losses: 2, pushes: 0, voids: 0, graded: 5, netUnits: -0.27 },
      { rank: 54, handle: "sacstim", displayName: "tim", wins: 3, losses: 3, pushes: 0, voids: 0, graded: 6, netUnits: -0.28 },
      { rank: 55, handle: "cotechaos", displayName: "CoteChaos", wins: 4, losses: 9, pushes: 0, voids: 0, graded: 13, netUnits: -0.4 },
      { rank: 56, handle: "g5jake", displayName: "G5 Jake", wins: 6, losses: 8, pushes: 0, voids: 2, graded: 16, netUnits: -0.48 },
      { rank: 57, handle: "bigbetco", displayName: "Big Bet Co", wins: 0, losses: 1, pushes: 0, voids: 0, graded: 1, netUnits: -1.0 },
      { rank: 58, handle: "danymclain", displayName: "Dany McLain", wins: 0, losses: 1, pushes: 0, voids: 0, graded: 1, netUnits: -1.0 },
      { rank: 59, handle: "codybrownbets", displayName: "Cody Brown Bets", wins: 12, losses: 8, pushes: 0, voids: 0, graded: 20, netUnits: -1.18 },
      { rank: 60, handle: "leventis72_", displayName: null, wins: 4, losses: 5, pushes: 0, voids: 0, graded: 9, netUnits: -1.33 },
      { rank: 61, handle: "gametimewinner", displayName: "GAMETIMEWINNER", wins: 2, losses: 2, pushes: 0, voids: 0, graded: 4, netUnits: -1.43 },
      { rank: 62, handle: "istrobey", displayName: "Strobey\ud83d\ude08", wins: 2, losses: 4, pushes: 0, voids: 0, graded: 6, netUnits: -1.48 },
      { rank: 63, handle: "robotbets", displayName: "RobotBots", wins: 3, losses: 4, pushes: 0, voids: 0, graded: 7, netUnits: -1.5 },
      { rank: 64, handle: "invisiblestats", displayName: "Invisible Insider", wins: 8, losses: 8, pushes: 0, voids: 0, graded: 16, netUnits: -1.67 },
      { rank: 65, handle: "prosportshq1", displayName: "Prosports Wager", wins: 15, losses: 11, pushes: 0, voids: 0, graded: 26, netUnits: -1.81 },
      { rank: 66, handle: "sbapicks", displayName: "SBAPicks", wins: 3, losses: 6, pushes: 0, voids: 0, graded: 9, netUnits: -2.0 },
      { rank: 67, handle: "eliteewagers", displayName: "EliteWagers", wins: 0, losses: 2, pushes: 0, voids: 0, graded: 2, netUnits: -2.0 },
      { rank: 68, handle: "natealgopicks", displayName: "Nate's Algo Picks", wins: 0, losses: 2, pushes: 0, voids: 0, graded: 2, netUnits: -2.0 },
      { rank: 69, handle: "tonestakes", displayName: "TonesTakes", wins: 16, losses: 18, pushes: 0, voids: 0, graded: 34, netUnits: -2.12 },
      { rank: 70, handle: "bluefirepicks", displayName: "BFP", wins: 3, losses: 5, pushes: 0, voids: 0, graded: 8, netUnits: -2.28 },
      { rank: 71, handle: "jasmine_parker", displayName: "JP", wins: 0, losses: 3, pushes: 0, voids: 0, graded: 3, netUnits: -3.0 },
      { rank: 72, handle: "sharkybets_", displayName: "Sharky\ud83e\udd88", wins: 1, losses: 2, pushes: 0, voids: 0, graded: 3, netUnits: -3.69 },
      { rank: 73, handle: "spideybets", displayName: "$pider Bets \ud83d\udd78 \ud83d\udd77", wins: 2, losses: 5, pushes: 0, voids: 0, graded: 7, netUnits: -3.92 },
      { rank: 74, handle: "bookie___bandit", displayName: "Bookie Bandit", wins: 45, losses: 24, pushes: 0, voids: 1, graded: 70, netUnits: -3.99 },
      { rank: 75, handle: "picksoffice", displayName: "Picks Office", wins: 0, losses: 4, pushes: 0, voids: 0, graded: 4, netUnits: -4.0 },
      { rank: 76, handle: "splendosports", displayName: "Splendo", wins: 0, losses: 4, pushes: 0, voids: 0, graded: 4, netUnits: -4.0 },
      { rank: 77, handle: "thelinewizard_", displayName: "\ud83e\uddd9\u200d\u2642\ufe0f", wins: 11, losses: 18, pushes: 0, voids: 0, graded: 29, netUnits: -4.58 },
      { rank: 78, handle: "bigbuckbets", displayName: "Moneyline Model Man", wins: 2, losses: 7, pushes: 0, voids: 0, graded: 9, netUnits: -4.98 },
      { rank: 79, handle: "jackonthebooks3", displayName: "JackOnTheBooks", wins: 5, losses: 11, pushes: 1, voids: 0, graded: 17, netUnits: -5.8 },
      { rank: 80, handle: "picksagainst", displayName: "Rhino Bets", wins: 0, losses: 6, pushes: 0, voids: 0, graded: 6, netUnits: -6.0 },
      { rank: 81, handle: "tadpolebe2021", displayName: "Tadpole Sports Betting", wins: 5, losses: 12, pushes: 0, voids: 0, graded: 17, netUnits: -6.94 },
      { rank: 82, handle: "brentburrisbet", displayName: "Brent Burris | Sports Betting", wins: 1, losses: 20, pushes: 0, voids: 0, graded: 21, netUnits: -7.14 },
      { rank: 83, handle: "bambino_bets", displayName: "George Kent", wins: 1, losses: 9, pushes: 0, voids: 1, graded: 11, netUnits: -7.26 },
      { rank: 84, handle: "4kl0cks", displayName: "4klocks \ud83c\udfb0", wins: 7, losses: 10, pushes: 0, voids: 0, graded: 17, netUnits: -7.74 },
      { rank: 85, handle: "wizbetz", displayName: "Wiz Betz", wins: 4, losses: 13, pushes: 0, voids: 0, graded: 17, netUnits: -7.81 },
      { rank: 86, handle: "bookitwithtrent", displayName: "Trent Attyah", wins: 9, losses: 15, pushes: 0, voids: 0, graded: 24, netUnits: -7.86 },
      { rank: 87, handle: "investinbets12", displayName: "Invest In Bets", wins: 0, losses: 6, pushes: 0, voids: 0, graded: 6, netUnits: -8.0 },
      { rank: 88, handle: "parlaysprodigy", displayName: "Parlay Prodigy", wins: 0, losses: 8, pushes: 0, voids: 0, graded: 8, netUnits: -8.0 },
      { rank: 89, handle: "bigbetsbrand123", displayName: "Mr Big Bets", wins: 2, losses: 14, pushes: 0, voids: 0, graded: 16, netUnits: -8.06 },
      { rank: 90, handle: "ml_king24", displayName: "ml king", wins: 3, losses: 11, pushes: 0, voids: 0, graded: 14, netUnits: -8.67 },
      { rank: 91, handle: "strongleans", displayName: "Strong Leans", wins: 0, losses: 9, pushes: 0, voids: 0, graded: 9, netUnits: -9.0 },
      { rank: 92, handle: "joes_picks", displayName: "Joe\u2019s Picks", wins: 6, losses: 12, pushes: 1, voids: 0, graded: 19, netUnits: -10.36 },
      { rank: 93, handle: "luckyluke_hits", displayName: "Lucky Luke", wins: 2, losses: 6, pushes: 0, voids: 0, graded: 8, netUnits: -10.61 },
      { rank: 94, handle: "milesparkerbets", displayName: "Miles Parker NFL Picks", wins: 13, losses: 22, pushes: 0, voids: 0, graded: 35, netUnits: -10.66 },
      { rank: 95, handle: "riostaystrue", displayName: "Rio", wins: 0, losses: 11, pushes: 0, voids: 0, graded: 11, netUnits: -11.0 },
      { rank: 96, handle: "thejoeholkashow", displayName: "Joe Holka", wins: 7, losses: 17, pushes: 0, voids: 0, graded: 24, netUnits: -11.4 },
      { rank: 97, handle: "chalkitspreads", displayName: "ChalkIt | +EV Betting", wins: 4, losses: 11, pushes: 0, voids: 0, graded: 15, netUnits: -12.16 },
      { rank: 98, handle: "dbunk_picks", displayName: "Demetrius", wins: 27, losses: 41, pushes: 0, voids: 1, graded: 69, netUnits: -12.79 },
      { rank: 99, handle: "prop_k_parlays", displayName: "Prodigy Prop King", wins: 72, losses: 64, pushes: 1, voids: 2, graded: 139, netUnits: -16.27 },
    ],
  },
];

export function getArchive(slug: string): LeaderboardArchive | undefined {
  return LEADERBOARD_ARCHIVES.find((a) => a.slug === slug);
}
