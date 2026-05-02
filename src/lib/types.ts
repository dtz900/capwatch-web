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
  tweet_url: string | null;
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

export interface SlatePick {
  capper_id: number;
  capper_rank: number | null;
  handle: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  tier: number | null;
  has_paid_program: boolean;
  kind: "straight" | "parlay_leg";
  leg_count: number | null;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  stake_units: number;
  posted_at: string | null;
  tweet_url: string | null;
  source: string | null;
}

export interface SlateGame {
  game_id: number;
  away_team: string | null;
  home_team: string | null;
  away_starter: string | null;
  home_starter: string | null;
  game_date: string | null;
  game_time: string | null;
  picks: SlatePick[];
}

export interface SlateMostPicked {
  game_id: number;
  away_team: string | null;
  home_team: string | null;
  pick_count: number;
}

export interface SlateResponse {
  date: string;
  games: SlateGame[];
  most_picked: SlateMostPicked[];
}

export interface HistoryPick {
  id: number;
  kind: "straight" | "parlay";
  parlay_id: number | null;
  leg_count?: number | null;
  game_label: string | null;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  units: number | null;
  outcome: FormOutcome | null;
  profit_units: number | null;
  posted_at: string | null;
  tweet_url: string | null;
  source: string | null;
  player_name?: string | null;
}

export interface CapperAggregate {
  time_window: Window;
  picks_count: number;
  wins: number;
  losses: number;
  pushes: number;
  units_profit: number;
  roi_pct: number;
  win_rate: number;
  clv_avg: number | null;
  current_streak: number;
  refreshed_at: string | null;
  bet_type_breakdown: Record<string, number> | null;
  biggest_win: BiggestWin | null;
  tracked_since: string | null;
  tweets_parsed: number | null;
  parlay_share: number | null;
  deleted_picks_count: number | null;
}

export interface CapperProfile {
  capper: {
    id: number;
    handle: string | null;
    display_name: string | null;
    tier: number | null;
    activity_status: ActivityStatus;
    is_claimed: boolean;
    profile_image_url: string | null;
    follower_count: number | null;
    has_paid_program: boolean;
    last_pick_at: string | null;
    last_tweet_at: string | null;
  };
  aggregates: Partial<Record<Window, CapperAggregate>>;
  pending: HistoryPick[];
  history: HistoryPick[];
  history_total: number;
  history_offset: number;
  history_limit: number;
}
