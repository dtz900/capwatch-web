export type ActivityStatus = "active" | "quiet" | "dormant" | "dark";
export type FormOutcome = "W" | "L" | "P";
export type Window = "all_time" | "season" | "last_30" | "last_7";
export type Sort = "roi_pct" | "units_profit" | "win_rate" | "picks_count";
export type BetTypeFilter = "all" | "straights" | "parlays";

export interface BiggestWin {
  units: number;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  game_label: string | null;
  game_date: string | null;
  tweet_url: string | null;
  /** parlay_id of the underlying parlay when biggest_win is a Parlay row. */
  parlay_id?: number | null;
  /** Set by the profile endpoint when parlay_id matches a published
   * parlay_palace_entries row. The frontend renders a gold crown and a
   * link to /parlay-palace/<slug> when present. */
  palace_slug?: string | null;
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
  /** Signed count of consecutive profitable (>0) or losing (<0) settle-days,
   * most recent first. 0 = no streak. Drives the hot/cold StreakBadge. */
  current_day_streak?: number;
  bet_type_breakdown: Record<string, number>;
  biggest_win: BiggestWin | null;
  tracked_since: string | null;
  tweets_parsed: number;
  parlay_share: number;
  deleted_picks_count: number;
  live_picks_count: number;
  last_picks: LastPick[];
  trajectory_units?: number[];
}

export interface LeaderboardResponse {
  window: Window;
  sort: Sort;
  bet_type?: BetTypeFilter;
  min_picks: number;
  active_only: boolean;
  leaderboard: CapperRow[];
  platform_stats?: PlatformStats;
}

export interface PlatformStats {
  graded_picks_total: number;
  cappers_tracked: number;
}

export type Outcome = "W" | "L" | "P" | "V";

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
  outcome: Outcome | null;
  profit_units: number | null;
}

export interface DaySummary {
  graded_count: number;
  pending_count: number;
  wins: number;
  losses: number;
  pushes: number;
  voids: number;
  net_units: number;
}

export type GameState = "scheduled" | "in_progress" | "final";
export type InningHalf = "top" | "bot" | "mid" | "end";

export interface SlateGame {
  game_id: number;
  away_team: string | null;
  home_team: string | null;
  away_starter: string | null;
  home_starter: string | null;
  game_date: string | null;
  game_time: string | null;

  game_state: GameState;
  away_score: number | null;
  home_score: number | null;
  inning: number | null;
  inning_half: InningHalf | null;
  outs: number | null;

  picks: SlatePick[];
}

export interface SlateMostPicked {
  game_id: number;
  away_team: string | null;
  home_team: string | null;
  pick_count: number;
}

export interface SlateCapperSummary {
  capper_id: number;
  handle: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  capper_rank: number | null;
  wins: number;
  losses: number;
  pushes: number;
  voids: number;
  graded_count: number;
  pending_count: number;
  net_units: number;
}

export interface SlateResponse {
  date: string;
  games: SlateGame[];
  most_picked: SlateMostPicked[];
  day_summary: DaySummary;
  capper_summary: SlateCapperSummary[];
}

export type GradingOddsSource =
  | "posted"
  | "pinnacle_close"
  | "no_close_available"
  | "fallback_-110";

export interface HistoryPickLeg {
  leg_index: number;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  /** W / L / P / V, or null when the leg is still undecided (live parlay).
   * V appears when the leg was voided per book rules (e.g. a pre-
   * postponement bet on a game that got rescheduled). The parlay still
   * settles on the surviving legs. */
  outcome: "W" | "L" | "P" | "V" | null;
  game_label: string | null;
}

export interface HistoryPick {
  id: number;
  kind: "straight" | "parlay";
  parlay_id: number | null;
  leg_count?: number | null;
  game_label: string | null;
  /** Date the bet plays/settles (YYYY-MM-DD, ET). For multi-leg parlays
   * spanning days, the earliest leg's game_date. Prefer this over posted_at
   * for display so a Friday-night tweet for Saturday's slate shows Saturday. */
  game_date: string | null;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  grading_odds?: number | null;
  grading_odds_source?: GradingOddsSource | null;
  units: number | null;
  outcome: FormOutcome | null;
  profit_units: number | null;
  posted_at: string | null;
  tweet_url: string | null;
  source: string | null;
  player_name?: string | null;
  /** Present on parlay rows. Ordered by parsed leg index ascending. */
  legs?: HistoryPickLeg[];
  /** Source tweet has been deleted from X at any point. */
  was_deleted_on_x?: boolean;
  /** Deletion timestamp is after the game's commence_time -- the
   * brand-killer pattern (capper pulling the receipt after the bet
   * went bad). Always false for multi-leg parlays. */
  deleted_after_game_start?: boolean;
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
  /** Fraction (0..1) of CLV-eligible (posted ML) picks whose price beat the
   * Pinnacle close. null when no eligible picks. Admin-only for now. */
  clv_beat_pct: number | null;
  /** Count of picks with a computed CLV in this slice (sample size). */
  clv_count: number | null;
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
  /** Per-window cumulative profit_units series, oldest-first. Used by the
   * hero sparkline so the trajectory reflects the selected window without
   * needing the table-paginated history array to contain enough depth. */
  trajectory?: Partial<Record<Window, number[]>>;
}

export interface PalaceLeg {
  leg_index: number;
  game_id: string | null;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  player_name: string | null;
  player_id: number | null;
  headshot_url: string | null;
  result_text: string | null;
  score_text: string | null;
  won: boolean | null;
  team_logo_url: string | null;
  team_abbr: string | null;
  away_logo_url: string | null;
  home_logo_url: string | null;
  away_abbr: string | null;
  home_abbr: string | null;
  is_clincher: boolean;
}

export interface PalaceBody {
  legs: PalaceLeg[];
  clincher: { leg_index: number; player_name: string | null;
              selection: string | null; game_id: string | null } | null;
  hero: { kind: "photo" | "clip" | "headshot"; url: string } | null;
  hero_kind: "photo" | "clip" | "headshot" | null;
  media_attribution: string;
  capper_handle: string | null;
  capper_display_name: string | null;
  capper_image_url: string | null;
}

export interface PalaceEntry {
  slug: string;
  title: string | null;
  capper_handle: string | null;
  recap_blurb: string | null;
  units_profit: number | null;
  combined_odds: number | null;
  leg_count: number | null;
  slate_date: string | null;
  hero_kind: "photo" | "clip" | "headshot" | null;
  hero_url: string | null;
  body: PalaceBody | null;
  published_at: string | null;
}

export interface PalaceCandidate {
  parlay_id: number;
  capper_handle: string | null;
  capper_display_name: string | null;
  combined_odds: number | null;
  profit_units: number;
  leg_count: number;
  graded_at: string | null;
  status: "candidate" | "draft" | "published";
}
