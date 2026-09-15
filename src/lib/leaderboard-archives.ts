/**
 * Frozen leaderboard archives. Each entry is a week (NFL) or day (MLB) board
 * exactly as it stood when it was archived, ranked by net units. Numbers do
 * not drift with later regrades; that permanence is the point of the link.
 * The live, still-mutable view is always one click away via `liveHref`.
 *
 * Issuance: see D:/EA/projects/tailslips/leaderboard-archives/README.md
 * (week_slate.py -> unpriced.py -> gen_archive.py).
 */

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
  /** Picks (or parlays) that graded W/L with zero units because no price was
   * posted and no Pinnacle line matched. */
  unpriced: number;
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
  {
    slug: "nfl-2026-week-1",
    sport: "nfl",
    title: "NFL Week 1",
    rangeLabel: "Sep 9 to 14, 2026",
    season: 2026,
    week: 1,
    frozenAt: "2026-09-14",
    games: 16,
    totals: { graded: 1367, wins: 595, losses: 754, pushes: 11, voids: 7, netUnits: 6.75, unpriced: 205 },
    liveHref: "/slate?sport=nfl&week=1",
    rows: [
      { rank: 1, handle: "sbr_bets", displayName: "SBR", avatarUrl: "https://pbs.twimg.com/profile_images/2057174598811025408/Tfi7Ozfn.jpg", wins: 11, losses: 12, pushes: 0, voids: 0, graded: 23, netUnits: 73.72, unpriced: 0 },
      { rank: 2, handle: "b1gredbets", displayName: "#Red\ud83d\udea8", avatarUrl: "https://pbs.twimg.com/profile_images/2078154253533663232/sHEnZDA-.jpg", wins: 12, losses: 14, pushes: 0, voids: 0, graded: 26, netUnits: 16.99, unpriced: 0 },
      { rank: 3, handle: "blizzybets", displayName: "BlizzyBets\ud83e\udd76", avatarUrl: "https://pbs.twimg.com/profile_images/1817218503750942721/v9hzl8Fs.jpg", wins: 1, losses: 3, pushes: 0, voids: 0, graded: 4, netUnits: 10.53, unpriced: 1 },
      { rank: 4, handle: "moneyline_mav", displayName: "MoneylineMav", avatarUrl: "https://pbs.twimg.com/profile_images/1979079235122737154/t6x-ggFL.jpg", wins: 14, losses: 8, pushes: 0, voids: 0, graded: 22, netUnits: 9.96, unpriced: 0 },
      { rank: 5, handle: "robdfb", displayName: "Rob Donaldson", avatarUrl: "https://pbs.twimg.com/profile_images/1624902227880992768/yq8lewSU.jpg", wins: 6, losses: 4, pushes: 0, voids: 0, graded: 10, netUnits: 9.0, unpriced: 1 },
      { rank: 6, handle: "lottolocks", displayName: "Lotto Locks", avatarUrl: "https://pbs.twimg.com/profile_images/2077514955293671425/puF8IH6x.jpg", wins: 3, losses: 31, pushes: 0, voids: 0, graded: 34, netUnits: 7.98, unpriced: 2 },
      { rank: 7, handle: "outoflinebets", displayName: "Out of Line Bets", avatarUrl: "https://pbs.twimg.com/profile_images/1798808867263926272/PIuEm69s.jpg", wins: 2, losses: 6, pushes: 0, voids: 0, graded: 8, netUnits: 7.75, unpriced: 0 },
      { rank: 8, handle: "lincolng05bets", displayName: "Lincoln.", avatarUrl: "https://pbs.twimg.com/profile_images/2085583093834874880/aAXUw_Kj.jpg", wins: 27, losses: 23, pushes: 0, voids: 0, graded: 50, netUnits: 7.58, unpriced: 0 },
      { rank: 9, handle: "asvpxhampicks", displayName: "Abe", avatarUrl: "https://pbs.twimg.com/profile_images/1890865613087580160/NijZURhR.jpg", wins: 7, losses: 4, pushes: 0, voids: 0, graded: 11, netUnits: 7.19, unpriced: 0 },
      { rank: 10, handle: "better___bett0r", displayName: "Better Bettor", avatarUrl: "https://pbs.twimg.com/profile_images/1730628983933284352/eZgmUtBX.jpg", wins: 5, losses: 2, pushes: 0, voids: 0, graded: 7, netUnits: 6.94, unpriced: 0 },
      { rank: 11, handle: "scottfosterlock", displayName: "Scott Foster\u2019s Sports Picks", avatarUrl: "https://pbs.twimg.com/profile_images/1679159508919001089/65_KnshD.jpg", wins: 14, losses: 9, pushes: 1, voids: 0, graded: 24, netUnits: 6.78, unpriced: 1 },
      { rank: 12, handle: "sps_birdman", displayName: "bird man \ud83d\udc26", avatarUrl: "https://pbs.twimg.com/profile_images/2078181895142285312/p11XbebO.jpg", wins: 1, losses: 1, pushes: 0, voids: 0, graded: 2, netUnits: 6.0, unpriced: 0 },
      { rank: 13, handle: "thebettingqueen", displayName: "thebettingqueen", avatarUrl: "https://pbs.twimg.com/profile_images/1940216004241395712/9kaxbMjk.jpg", wins: 3, losses: 6, pushes: 0, voids: 0, graded: 9, netUnits: 5.6, unpriced: 0 },
      { rank: 14, handle: "dai_bets", displayName: "DaiBets", avatarUrl: "https://pbs.twimg.com/profile_images/1590577028348014593/Ae_GXYUL.jpg", wins: 6, losses: 2, pushes: 0, voids: 0, graded: 8, netUnits: 5.57, unpriced: 0 },
      { rank: 15, handle: "clvprophets", displayName: "CLVProphets", avatarUrl: "https://pbs.twimg.com/profile_images/1927580464836939776/G2H0eBMP.jpg", wins: 2, losses: 3, pushes: 1, voids: 0, graded: 6, netUnits: 5.18, unpriced: 0 },
      { rank: 16, handle: "max_picks", displayName: "MAXPicks", avatarUrl: "https://pbs.twimg.com/profile_images/1980376897902014464/iCKSrg3R.jpg", wins: 3, losses: 1, pushes: 0, voids: 0, graded: 4, netUnits: 5.13, unpriced: 0 },
      { rank: 17, handle: "tahoebettor", displayName: "Johnny Tahoe", avatarUrl: "https://pbs.twimg.com/profile_images/2082871638375444480/phdr2gUQ.jpg", wins: 7, losses: 3, pushes: 1, voids: 0, graded: 11, netUnits: 4.97, unpriced: 0 },
      { rank: 18, handle: "itsparlaypete", displayName: "Parlay Pete", avatarUrl: "https://pbs.twimg.com/profile_images/2075265627552432129/lGXQ46jk.jpg", wins: 6, losses: 4, pushes: 0, voids: 0, graded: 10, netUnits: 4.52, unpriced: 0 },
      { rank: 19, handle: "dommylocked", displayName: "Dommy", avatarUrl: "https://pbs.twimg.com/profile_images/2083996323657760768/2F24nMvb.jpg", wins: 4, losses: 1, pushes: 0, voids: 0, graded: 5, netUnits: 4.21, unpriced: 0 },
      { rank: 20, handle: "bayouboysbets", displayName: "BayouBoysBets", avatarUrl: "https://pbs.twimg.com/profile_images/2084659678634532864/-Y1PnZxV.jpg", wins: 9, losses: 7, pushes: 0, voids: 0, graded: 16, netUnits: 4.01, unpriced: 0 },
      { rank: 21, handle: "razorsinsight", displayName: "Razore", avatarUrl: "https://pbs.twimg.com/profile_images/1996351526907076608/soLDNCov.jpg", wins: 4, losses: 1, pushes: 0, voids: 0, graded: 5, netUnits: 3.93, unpriced: 0 },
      { rank: 22, handle: "moneyplayzz", displayName: "Moneyplayzz", avatarUrl: "https://pbs.twimg.com/profile_images/2025804170817609728/cOn3RAcX.jpg", wins: 7, losses: 3, pushes: 1, voids: 0, graded: 11, netUnits: 3.75, unpriced: 0 },
      { rank: 23, handle: "lineupswinning", displayName: "Winning Lineups", avatarUrl: "https://pbs.twimg.com/profile_images/2073578909900431360/Jq7J56Ug.jpg", wins: 3, losses: 3, pushes: 0, voids: 0, graded: 6, netUnits: 3.57, unpriced: 1 },
      { rank: 24, handle: "sexualslips", displayName: "sexualslips", avatarUrl: "https://pbs.twimg.com/profile_images/1768763965826277376/R0anbMgG.jpg", wins: 5, losses: 2, pushes: 1, voids: 0, graded: 8, netUnits: 3.37, unpriced: 0 },
      { rank: 25, handle: "lucksociety", displayName: "Luck Society", avatarUrl: "https://pbs.twimg.com/profile_images/1924158981875867648/EVDOBECM.jpg", wins: 2, losses: 1, pushes: 0, voids: 0, graded: 3, netUnits: 3.15, unpriced: 0 },
      { rank: 26, handle: "a11bets", displayName: "A11 Bets", avatarUrl: "https://pbs.twimg.com/profile_images/2016389639968329728/KPpXoI-p.jpg", wins: 3, losses: 0, pushes: 0, voids: 0, graded: 3, netUnits: 2.4, unpriced: 0 },
      { rank: 27, handle: "degen__inc", displayName: "Crich \u2666\ufe0f", avatarUrl: "https://pbs.twimg.com/profile_images/1697390380541497344/DM3Yfzoe.jpg", wins: 11, losses: 8, pushes: 0, voids: 0, graded: 19, netUnits: 2.35, unpriced: 1 },
      { rank: 28, handle: "pocketparlay", displayName: "Pocket Parlay", avatarUrl: "https://pbs.twimg.com/profile_images/1751984705803554816/0a26HQzX.jpg", wins: 8, losses: 5, pushes: 0, voids: 0, graded: 13, netUnits: 2.23, unpriced: 0 },
      { rank: 29, handle: "ibetpeterv", displayName: "Peter V", avatarUrl: "https://pbs.twimg.com/profile_images/1955039876321361920/OddaSVBG.jpg", wins: 6, losses: 5, pushes: 0, voids: 0, graded: 11, netUnits: 2.18, unpriced: 0 },
      { rank: 30, handle: "swampy_swami", displayName: "SWAMPTHING", avatarUrl: "https://pbs.twimg.com/profile_images/378800000465143752/59deee4074051f6168c2c3b4c28d6cbd.jpeg", wins: 15, losses: 26, pushes: 1, voids: 0, graded: 42, netUnits: 2.1, unpriced: 0 },
      { rank: 31, handle: "renzomoneyline", displayName: "R$", avatarUrl: "https://pbs.twimg.com/profile_images/1644108169520779264/k0Wlutpu.jpg", wins: 7, losses: 3, pushes: 0, voids: 0, graded: 10, netUnits: 1.87, unpriced: 5 },
      { rank: 32, handle: "joshuadasilva", displayName: "Josh", avatarUrl: "https://pbs.twimg.com/profile_images/2070283857853607936/lvR8lEFP.jpg", wins: 1, losses: 7, pushes: 0, voids: 0, graded: 8, netUnits: 1.79, unpriced: 3 },
      { rank: 33, handle: "goatcapital_", displayName: "GOAT Capital Sports", avatarUrl: "https://pbs.twimg.com/profile_images/1105173385393463296/ws9Vef9j.jpg", wins: 6, losses: 10, pushes: 0, voids: 0, graded: 16, netUnits: 1.73, unpriced: 8 },
      { rank: 34, handle: "thelineaudit", displayName: "TheLineAudit", avatarUrl: "https://pbs.twimg.com/profile_images/2057955600546295808/lxZyU_wg.jpg", wins: 7, losses: 5, pushes: 0, voids: 0, graded: 12, netUnits: 1.6, unpriced: 0 },
      { rank: 35, handle: "phillysharp1", displayName: "Philly Sharp", avatarUrl: "https://pbs.twimg.com/profile_images/2089494774264856576/UYqMf58o.jpg", wins: 7, losses: 4, pushes: 0, voids: 0, graded: 11, netUnits: 1.54, unpriced: 0 },
      { rank: 36, handle: "smsports34", displayName: "Smart Money Sports", avatarUrl: "https://pbs.twimg.com/profile_images/1194298978294218752/cCkk2CFU.jpg", wins: 2, losses: 1, pushes: 0, voids: 0, graded: 3, netUnits: 1.28, unpriced: 0 },
      { rank: 37, handle: "showtimepicks2", displayName: "Showtime Picks", avatarUrl: "https://pbs.twimg.com/profile_images/2076162653899112449/FnlsYEnR.jpg", wins: 5, losses: 3, pushes: 1, voids: 0, graded: 9, netUnits: 1.19, unpriced: 0 },
      { rank: 38, handle: "cdlocklounge", displayName: "CDLockLounge", avatarUrl: "https://pbs.twimg.com/profile_images/2093382307251957760/PG0BWf_T.jpg", wins: 7, losses: 8, pushes: 0, voids: 0, graded: 15, netUnits: 0.94, unpriced: 0 },
      { rank: 39, handle: "antscovers", displayName: "AntsCovers", avatarUrl: "https://pbs.twimg.com/profile_images/1227067556168515584/0i54DxZF.jpg", wins: 1, losses: 0, pushes: 0, voids: 0, graded: 1, netUnits: 0.93, unpriced: 0 },
      { rank: 40, handle: "Clutch_Betss", displayName: "Clutch Bets", avatarUrl: "https://pbs.twimg.com/profile_images/2082136269182898176/kpQ9FM-x.jpg", wins: 3, losses: 2, pushes: 0, voids: 0, graded: 5, netUnits: 0.88, unpriced: 0 },
      { rank: 41, handle: "trupalocks", displayName: "TRUPA LOCKS", avatarUrl: "https://pbs.twimg.com/profile_images/2051393193841774592/MmiRN31b.jpg", wins: 1, losses: 0, pushes: 0, voids: 0, graded: 1, netUnits: 0.84, unpriced: 0 },
      { rank: 42, handle: "kryptonprobett", displayName: "Krypton Pro Betting", avatarUrl: "https://pbs.twimg.com/profile_images/1051831712282537984/yMd9HcnF.jpg", wins: 1, losses: 1, pushes: 0, voids: 0, graded: 2, netUnits: 0.82, unpriced: 0 },
      { rank: 43, handle: "bettor_callpaul", displayName: "Bettor Call Paul", avatarUrl: "https://pbs.twimg.com/profile_images/1233596186138775552/6Rb1ivcF.jpg", wins: 1, losses: 0, pushes: 0, voids: 0, graded: 1, netUnits: 0.77, unpriced: 0 },
      { rank: 44, handle: "cinematicc", displayName: "Alex", avatarUrl: "https://pbs.twimg.com/profile_images/2085465637535821824/C3xP0Hwi.jpg", wins: 2, losses: 2, pushes: 0, voids: 0, graded: 4, netUnits: 0.67, unpriced: 1 },
      { rank: 45, handle: "franklincovers", displayName: "franklin", avatarUrl: "https://pbs.twimg.com/profile_images/1925713688125685760/lBJHd3Eb.jpg", wins: 2, losses: 1, pushes: 0, voids: 0, graded: 3, netUnits: 0.63, unpriced: 0 },
      { rank: 46, handle: "thewageranalyst", displayName: "Wager Analyst", avatarUrl: "https://pbs.twimg.com/profile_images/1960471196371148800/bobAxoip.jpg", wins: 2, losses: 1, pushes: 0, voids: 0, graded: 3, netUnits: 0.6, unpriced: 0 },
      { rank: 47, handle: "yennysports", displayName: "Yenny Sports", avatarUrl: "https://pbs.twimg.com/profile_images/1582467935146237959/Wo-OKeEm.jpg", wins: 7, losses: 6, pushes: 1, voids: 0, graded: 14, netUnits: 0.17, unpriced: 0 },
      { rank: 48, handle: "oddsdonny", displayName: "Odds Don", avatarUrl: "https://pbs.twimg.com/profile_images/2045906034649092096/ItZ5QTya.jpg", wins: 1, losses: 1, pushes: 0, voids: 0, graded: 2, netUnits: 0.09, unpriced: 0 },
      { rank: 49, handle: "lappylocks", displayName: "Lappy Locks", avatarUrl: "https://pbs.twimg.com/profile_images/2088346074813698048/cR8gfl6G.jpg", wins: 5, losses: 2, pushes: 0, voids: 0, graded: 7, netUnits: 0.0, unpriced: 7 },
      { rank: 50, handle: "plyrix_picks", displayName: "Plyrix Picks", avatarUrl: "https://pbs.twimg.com/profile_images/2042408810921230338/SFoIry8v.jpg", wins: 3, losses: 1, pushes: 0, voids: 0, graded: 4, netUnits: 0.0, unpriced: 2 },
      { rank: 51, handle: "spreadwizard", displayName: "SpreadWizard", avatarUrl: "https://pbs.twimg.com/profile_images/566810650152685570/2jewUzVS.jpeg", wins: 2, losses: 2, pushes: 0, voids: 0, graded: 4, netUnits: -0.14, unpriced: 0 },
      { rank: 52, handle: "skymoneysports", displayName: "Sky Money \ud83d\udcb0", avatarUrl: "https://pbs.twimg.com/profile_images/2042829877997637632/xkzGcpHi.jpg", wins: 2, losses: 2, pushes: 0, voids: 0, graded: 4, netUnits: -0.19, unpriced: 0 },
      { rank: 53, handle: "berts__bets", displayName: "BertsBets", avatarUrl: "https://pbs.twimg.com/profile_images/2057525414260621312/pyymeu1y.jpg", wins: 3, losses: 2, pushes: 0, voids: 0, graded: 5, netUnits: -0.27, unpriced: 0 },
      { rank: 54, handle: "sacstim", displayName: "tim", avatarUrl: "https://pbs.twimg.com/profile_images/1915428364015357952/bphQCFph.jpg", wins: 3, losses: 3, pushes: 0, voids: 0, graded: 6, netUnits: -0.28, unpriced: 0 },
      { rank: 55, handle: "cotechaos", displayName: "CoteChaos", avatarUrl: "https://pbs.twimg.com/profile_images/1995628612331208706/S2LEejIj.jpg", wins: 4, losses: 9, pushes: 0, voids: 0, graded: 13, netUnits: -0.4, unpriced: 0 },
      { rank: 56, handle: "g5jake", displayName: "G5 Jake", avatarUrl: "https://pbs.twimg.com/profile_images/2085076749558202368/_S7giA01.jpg", wins: 6, losses: 8, pushes: 0, voids: 2, graded: 16, netUnits: -0.48, unpriced: 0 },
      { rank: 57, handle: "bigbetco", displayName: "Big Bet Co", avatarUrl: "https://pbs.twimg.com/profile_images/1811587188171395072/Th2c4xvE.jpg", wins: 0, losses: 1, pushes: 0, voids: 0, graded: 1, netUnits: -1.0, unpriced: 0 },
      { rank: 58, handle: "danymclain", displayName: "Dany McLain", avatarUrl: "https://pbs.twimg.com/profile_images/1585361516475437056/g5dTQESn.jpg", wins: 0, losses: 1, pushes: 0, voids: 0, graded: 1, netUnits: -1.0, unpriced: 0 },
      { rank: 59, handle: "codybrownbets", displayName: "Cody Brown Bets", avatarUrl: "https://pbs.twimg.com/profile_images/2079159141814145024/DEZuc44a.jpg", wins: 12, losses: 8, pushes: 0, voids: 0, graded: 20, netUnits: -1.18, unpriced: 0 },
      { rank: 60, handle: "leventis72_", displayName: null, avatarUrl: "https://pbs.twimg.com/profile_images/2040806349714452480/SrrmKsML.jpg", wins: 4, losses: 5, pushes: 0, voids: 0, graded: 9, netUnits: -1.33, unpriced: 2 },
      { rank: 61, handle: "gametimewinner", displayName: "GAMETIMEWINNER", avatarUrl: "https://pbs.twimg.com/profile_images/2089083951843508224/AU1UuY87.jpg", wins: 2, losses: 2, pushes: 0, voids: 0, graded: 4, netUnits: -1.43, unpriced: 1 },
      { rank: 62, handle: "istrobey", displayName: "Strobey\ud83d\ude08", avatarUrl: "https://pbs.twimg.com/profile_images/2064855094957342720/8DIdnk8N.jpg", wins: 2, losses: 4, pushes: 0, voids: 0, graded: 6, netUnits: -1.48, unpriced: 0 },
      { rank: 63, handle: "robotbets", displayName: "RobotBots", avatarUrl: "https://pbs.twimg.com/profile_images/2072440113486065664/dkbZNlSW.jpg", wins: 3, losses: 4, pushes: 0, voids: 0, graded: 7, netUnits: -1.5, unpriced: 0 },
      { rank: 64, handle: "invisiblestats", displayName: "Invisible Insider", avatarUrl: "https://pbs.twimg.com/profile_images/2017678907516858368/9FrucIp0.jpg", wins: 8, losses: 8, pushes: 0, voids: 0, graded: 16, netUnits: -1.67, unpriced: 7 },
      { rank: 65, handle: "prosportshq1", displayName: "Prosports Wager", avatarUrl: "https://pbs.twimg.com/profile_images/2045770119859822592/F_7S6Pmp.jpg", wins: 15, losses: 11, pushes: 0, voids: 0, graded: 26, netUnits: -1.81, unpriced: 9 },
      { rank: 66, handle: "sbapicks", displayName: "SBAPicks", avatarUrl: "https://pbs.twimg.com/profile_images/2082921219121102848/6xiGQPdd.jpg", wins: 3, losses: 6, pushes: 0, voids: 0, graded: 9, netUnits: -2.0, unpriced: 7 },
      { rank: 67, handle: "eliteewagers", displayName: "EliteWagers", avatarUrl: "https://pbs.twimg.com/profile_images/1940022699054505985/p26xCozj.jpg", wins: 0, losses: 2, pushes: 0, voids: 0, graded: 2, netUnits: -2.0, unpriced: 0 },
      { rank: 68, handle: "natealgopicks", displayName: "Nate's Algo Picks", avatarUrl: "https://pbs.twimg.com/profile_images/2076470275655290880/rHjcKMdP.jpg", wins: 0, losses: 2, pushes: 0, voids: 0, graded: 2, netUnits: -2.0, unpriced: 0 },
      { rank: 69, handle: "tonestakes", displayName: "TonesTakes", avatarUrl: "https://pbs.twimg.com/profile_images/1381440333335175169/WtNUFAKq.jpg", wins: 16, losses: 18, pushes: 0, voids: 0, graded: 34, netUnits: -2.12, unpriced: 0 },
      { rank: 70, handle: "bluefirepicks", displayName: "BFP", avatarUrl: "https://pbs.twimg.com/profile_images/2090747830000373760/2QQ1UaDt.jpg", wins: 3, losses: 5, pushes: 0, voids: 0, graded: 8, netUnits: -2.28, unpriced: 0 },
      { rank: 71, handle: "jasmine_parker", displayName: "JP", avatarUrl: "https://pbs.twimg.com/profile_images/1794136332345671680/VpNwyCpw.jpg", wins: 0, losses: 3, pushes: 0, voids: 0, graded: 3, netUnits: -3.0, unpriced: 0 },
      { rank: 72, handle: "sharkybets_", displayName: "Sharky\ud83e\udd88", avatarUrl: "https://pbs.twimg.com/profile_images/2080354093864787968/2Nt1Gq52.jpg", wins: 1, losses: 2, pushes: 0, voids: 0, graded: 3, netUnits: -3.69, unpriced: 0 },
      { rank: 73, handle: "spideybets", displayName: "$pider Bets \ud83d\udd78 \ud83d\udd77", avatarUrl: "https://pbs.twimg.com/profile_images/2088677268377739264/ubHi3eDv.jpg", wins: 2, losses: 5, pushes: 0, voids: 0, graded: 7, netUnits: -3.92, unpriced: 0 },
      { rank: 74, handle: "bookie___bandit", displayName: "Bookie Bandit", avatarUrl: "https://pbs.twimg.com/profile_images/1936439050598019072/xjQXUMEo.jpg", wins: 45, losses: 24, pushes: 0, voids: 1, graded: 70, netUnits: -3.99, unpriced: 41 },
      { rank: 75, handle: "picksoffice", displayName: "Picks Office", avatarUrl: "https://pbs.twimg.com/profile_images/2029304916892651520/pV7gdtDp.jpg", wins: 0, losses: 4, pushes: 0, voids: 0, graded: 4, netUnits: -4.0, unpriced: 0 },
      { rank: 76, handle: "splendosports", displayName: "Splendo", avatarUrl: "https://pbs.twimg.com/profile_images/1964707464256929792/gBGyWStF.jpg", wins: 0, losses: 4, pushes: 0, voids: 0, graded: 4, netUnits: -4.0, unpriced: 0 },
      { rank: 77, handle: "thelinewizard_", displayName: "\ud83e\uddd9\u200d\u2642\ufe0f", avatarUrl: "https://pbs.twimg.com/profile_images/2078156008208109568/tyhd48gB.jpg", wins: 11, losses: 18, pushes: 0, voids: 0, graded: 29, netUnits: -4.58, unpriced: 3 },
      { rank: 78, handle: "bigbuckbets", displayName: "Moneyline Model Man", avatarUrl: "https://pbs.twimg.com/profile_images/2057503158209802240/KQcDo_5O.jpg", wins: 2, losses: 7, pushes: 0, voids: 0, graded: 9, netUnits: -4.98, unpriced: 0 },
      { rank: 79, handle: "jackonthebooks3", displayName: "JackOnTheBooks", avatarUrl: "https://pbs.twimg.com/profile_images/2026665305305501696/iuXdfGD8.jpg", wins: 5, losses: 11, pushes: 1, voids: 0, graded: 17, netUnits: -5.8, unpriced: 0 },
      { rank: 80, handle: "picksagainst", displayName: "Rhino Bets", avatarUrl: "https://pbs.twimg.com/profile_images/2021012630878466048/cjY47kzT.jpg", wins: 0, losses: 6, pushes: 0, voids: 0, graded: 6, netUnits: -6.0, unpriced: 0 },
      { rank: 81, handle: "tadpolebe2021", displayName: "Tadpole Sports Betting", avatarUrl: "https://pbs.twimg.com/profile_images/1915480736787812353/axXE6uXR.jpg", wins: 5, losses: 12, pushes: 0, voids: 0, graded: 17, netUnits: -6.94, unpriced: 1 },
      { rank: 82, handle: "brentburrisbet", displayName: "Brent Burris | Sports Betting", avatarUrl: "https://pbs.twimg.com/profile_images/2093997208890728448/MC8SulOQ.jpg", wins: 1, losses: 20, pushes: 0, voids: 0, graded: 21, netUnits: -7.14, unpriced: 0 },
      { rank: 83, handle: "bambino_bets", displayName: "George Kent", avatarUrl: "https://pbs.twimg.com/profile_images/1123259995523411968/H-G_sWD-.jpg", wins: 1, losses: 9, pushes: 0, voids: 1, graded: 11, netUnits: -7.26, unpriced: 1 },
      { rank: 84, handle: "4kl0cks", displayName: "4klocks \ud83c\udfb0", avatarUrl: "https://pbs.twimg.com/profile_images/2026708918651469824/q4bpjucH.jpg", wins: 7, losses: 10, pushes: 0, voids: 0, graded: 17, netUnits: -7.74, unpriced: 7 },
      { rank: 85, handle: "wizbetz", displayName: "Wiz Betz", avatarUrl: "https://pbs.twimg.com/profile_images/2006974717291360256/ubut38oF.jpg", wins: 4, losses: 13, pushes: 0, voids: 0, graded: 17, netUnits: -7.81, unpriced: 1 },
      { rank: 86, handle: "bookitwithtrent", displayName: "Trent Attyah", avatarUrl: "https://pbs.twimg.com/profile_images/1423478203100717059/epqKNm6g.jpg", wins: 9, losses: 15, pushes: 0, voids: 0, graded: 24, netUnits: -7.86, unpriced: 8 },
      { rank: 87, handle: "investinbets12", displayName: "Invest In Bets", avatarUrl: "https://pbs.twimg.com/profile_images/1923927674352766976/bZGlO0Xn.jpg", wins: 0, losses: 6, pushes: 0, voids: 0, graded: 6, netUnits: -8.0, unpriced: 0 },
      { rank: 88, handle: "parlaysprodigy", displayName: "Parlay Prodigy", avatarUrl: "https://pbs.twimg.com/profile_images/2024391704124530688/YXvphykd.jpg", wins: 0, losses: 8, pushes: 0, voids: 0, graded: 8, netUnits: -8.0, unpriced: 0 },
      { rank: 89, handle: "bigbetsbrand123", displayName: "Mr Big Bets", avatarUrl: "https://pbs.twimg.com/profile_images/1458085422517657616/-aeMphq3.jpg", wins: 2, losses: 14, pushes: 0, voids: 0, graded: 16, netUnits: -8.06, unpriced: 0 },
      { rank: 90, handle: "ml_king24", displayName: "ml king", avatarUrl: "https://pbs.twimg.com/profile_images/2036454968027496448/VYd0YrNB.jpg", wins: 3, losses: 11, pushes: 0, voids: 0, graded: 14, netUnits: -8.67, unpriced: 0 },
      { rank: 91, handle: "strongleans", displayName: "Strong Leans", avatarUrl: "https://pbs.twimg.com/profile_images/2059560893936005123/s0MEAtlw.jpg", wins: 0, losses: 9, pushes: 0, voids: 0, graded: 9, netUnits: -9.0, unpriced: 0 },
      { rank: 92, handle: "joes_picks", displayName: "Joe\u2019s Picks", avatarUrl: "https://pbs.twimg.com/profile_images/1833664941468876800/hA6lCzgR.jpg", wins: 6, losses: 12, pushes: 1, voids: 0, graded: 19, netUnits: -10.36, unpriced: 0 },
      { rank: 93, handle: "luckyluke_hits", displayName: "Lucky Luke", avatarUrl: "https://pbs.twimg.com/profile_images/2091532667326001152/zBydkX7s.jpg", wins: 2, losses: 6, pushes: 0, voids: 0, graded: 8, netUnits: -10.61, unpriced: 0 },
      { rank: 94, handle: "milesparkerbets", displayName: "Miles Parker NFL Picks", avatarUrl: "https://pbs.twimg.com/profile_images/1986002743253696512/lkjxoeaV.jpg", wins: 13, losses: 22, pushes: 0, voids: 0, graded: 35, netUnits: -10.66, unpriced: 5 },
      { rank: 95, handle: "riostaystrue", displayName: "Rio", avatarUrl: "https://pbs.twimg.com/profile_images/1838739411112189952/3HfyM1x8.jpg", wins: 0, losses: 11, pushes: 0, voids: 0, graded: 11, netUnits: -11.0, unpriced: 0 },
      { rank: 96, handle: "thejoeholkashow", displayName: "Joe Holka", avatarUrl: "https://pbs.twimg.com/profile_images/2038704972481617920/FVMNn9Gp.jpg", wins: 7, losses: 17, pushes: 0, voids: 0, graded: 24, netUnits: -11.4, unpriced: 4 },
      { rank: 97, handle: "chalkitspreads", displayName: "ChalkIt | +EV Betting", avatarUrl: "https://pbs.twimg.com/profile_images/2027306291035824128/dgp-ZfCi.jpg", wins: 4, losses: 11, pushes: 0, voids: 0, graded: 15, netUnits: -12.16, unpriced: 0 },
      { rank: 98, handle: "dbunk_picks", displayName: "Demetrius", avatarUrl: "https://pbs.twimg.com/profile_images/2094503481797115904/qqWS5nE5.jpg", wins: 27, losses: 41, pushes: 0, voids: 1, graded: 69, netUnits: -12.79, unpriced: 17 },
      { rank: 99, handle: "prop_k_parlays", displayName: "Prodigy Prop King", avatarUrl: "https://pbs.twimg.com/profile_images/2087841971528175616/ICs1RP4_.jpg", wins: 72, losses: 64, pushes: 1, voids: 2, graded: 139, netUnits: -16.27, unpriced: 58 },
    ],
  },
];

export function getArchive(slug: string): LeaderboardArchive | undefined {
  return LEADERBOARD_ARCHIVES.find((a) => a.slug === slug);
}
