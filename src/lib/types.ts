export type ActivityStatus = "active" | "quiet" | "dormant" | "dark";
export type FormOutcome = "W" | "L" | "P";
export type Window = "all_time" | "season" | "last_30" | "last_7";
export type Sort = "roi_pct" | "units_profit" | "win_rate" | "picks_count";

export interface BiggestWin {
  units: number;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  game_label: string | null;
  game_date: string | null;
}

export interface LastPick {
  kind: "straight" | "parlay";
  game_label: string | null;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  outcome: FormOutcome;
  posted_at: string | null;
  profit_units: number | null;
  leg_count: number | null;
  tweet_url: string | null;
}

export interface CapperRow {
  capper_id: string;
  handle: string | null;
  display_name: string | null;
  tier: number | null;
  activity_status: ActivityStatus;
  is_claimed: boolean;
  follower_count: number | null;
  profile_image_url: string | null;
  has_paid_program: boolean;
  picks_count: number;
  wins: number;
  losses: number;
  pushes: number;
  win_rate: number;
  units_profit: number;
  roi_pct: number;
  clv_avg: number | null;
  current_streak: number;
  bet_type_breakdown: Record<string, number>;
  biggest_win: BiggestWin | null;
  tracked_since: string | null;
  tweets_parsed: number;
  parlay_share: number;
  deleted_picks_count: number;
  last_picks: LastPick[];
}

export interface LeaderboardResponse {
  window: Window;
  sort: Sort;
  min_picks: number;
  active_only: boolean;
  leaderboard: CapperRow[];
}
