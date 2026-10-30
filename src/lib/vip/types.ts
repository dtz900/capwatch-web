export type VipSport = "MLB" | "NFL" | "NBA";

export interface VipSeller {
  capper_id: number;
  price_cents: number;
  founding: boolean;
  status: string;
  /** Book the builder prefills prices from; "other" = not in the feed. */
  preferred_book?: string | null;
}

export interface VipEligibility {
  sport: VipSport | string;
  eligible: boolean;
  eligible_since: string | null;
  units: number | null;
  n_picks: number | null;
  n_floor_picks: number | null;
  run_date: string | null;
  /* Latest history reason ('ok' | 'below_floor' | 'negative' | 'no_record')
     and consecutive failing nights; optional so older payloads still type. */
  reason?: string | null;
  fail_streak?: number;
}

export interface VipLockedSummary {
  pick_id: number;
  sport: string;
  reveal_at: string;
  posted_at: string;
}

export interface VipLockedPick {
  id: number;
  sport: string;
  market: string | null;
  selection: string;
  line: number | null;
  odds_taken: number | null;
  units: number | null;
  posted_at: string;
  reveal_at: string;
  game_id: string | null;
  parlay_id: number | null;
  parlay_leg_index: number | null;
  /* "AWAY @ HOME" and scheduled start; optional so an older platform build
     still renders. */
  matchup?: string | null;
  commence_time?: string | null;
  /* Not in the platform's _full_pick today; optional so a later addition is
     picked up without a type change. */
  stat_name?: string | null;
  direction?: string | null;
  player_name?: string | null;
}

export function isLockedPick(
  x: VipLockedSummary | VipLockedPick,
): x is VipLockedPick {
  return "selection" in x;
}

export interface VipCapperStatus {
  seller: VipSeller | null;
  eligibility: VipEligibility[];
  /** Per sport: cappers qualified to sell vs active in the 30 day window.
   *  Optional so an older platform build still renders. */
  sport_field?: Record<string, { qualified: number; active: number }>;
  door_open: boolean;
  /** Why new subscriptions are closed; null when open. Optional so an older
   *  platform build still renders. */
  door_closed_reason?: "not_selling" | "ineligible" | "silent" | null;
  viewer: { subscribed: boolean; is_owner: boolean };
  vip_record: {
    n: number;
    wins: number;
    losses: number;
    pushes: number;
    units: number;
  };
  locked: VipLockedSummary[] | VipLockedPick[];
}

export interface VipMe {
  capper: { id: number; handle: string } | null;
  seller: VipSeller | null;
  eligibility: Array<{
    sport: VipSport | string;
    eligible: boolean;
    eligible_since: string | null;
    fail_streak: number;
  }>;
  can_post_sports: string[];
}

export interface VipSubscription {
  capper: {
    id: number;
    handle: string;
    display_name: string | null;
    profile_image_url: string | null;
  };
  status: "active" | "paused" | "canceled";
  source: "admin" | "stripe";
  current_period_end: string | null;
  paused_at: string | null;
  pause_reason: string | null;
  /** Period end has passed. Optional so an older platform build still renders. */
  expired?: boolean;
  locked: VipLockedPick[];
}

export interface VipGameResult {
  game_pk: string | number;
  away_team: string;
  home_team: string;
  game_date: string;
  commence_time: string;
  game_number?: number;
}

export interface ManualLegInput {
  selection: string;
  game_id?: string | null;
  stat_name?: string | null;
  market?: string | null;
  direction?: string | null;
  line?: number | null;
  odds?: number | null;
  player_id?: number | null;
  player_name?: string | null;
  /** Leg sport on a multi-sport ticket (body sport "Multi"). */
  sport?: string | null;
}

export interface VipPickBody {
  legs: ManualLegInput[];
  units?: number;
  combined_odds?: number | null;
  sport: string;
  is_live?: boolean;
}

export interface VipClamp {
  /** null for a straight or the ticket price. */
  leg_index: number | null;
  posted: number;
  recorded: number;
  book: string | null;
}

export interface VipPickResult {
  ok: true;
  created_pick_ids: number[];
  parlay_id: number | null;
  /** Lead pick id: what fix and pull address. Optional for older builds. */
  ticket_id?: number;
  reveal_at: string;
  fix_deadline?: string;
  clamped?: VipClamp[];
}

/* ---------- pick builder board (GET /api/vip/board/...) ---------- */

export type BoardSport = "NBA" | "NFL";
export type BoardPeriodKey = "Game" | "1H" | "2H" | "1Q" | "2Q" | "3Q" | "4Q";

/** The exact leg a board side posts. */
export interface BoardLeg {
  sport: BoardSport;
  game_id: string;
  stat_name: string;
  selection: string;
  line: number | null;
  direction: "over" | "under" | null;
  player_id: string | null;
  player_name: string | null;
}

export interface BoardSide {
  key: string;
  /** Slip and subscriber text, e.g. "1H CHA +1". */
  label: string;
  /** Board button text, e.g. "+1". */
  short: string;
  /** Consensus American price: Pinnacle, else the book median. */
  price: number;
  /** Book id to American price at this exact rung ("pinnacle" included). */
  quotes: Record<string, number>;
  best: number;
  best_book: string | null;
  leg: BoardLeg;
}

export interface BoardPeriod {
  spread: [BoardSide, BoardSide] | null;
  total: [BoardSide, BoardSide] | null;
  ml: [BoardSide, BoardSide] | null;
  alt_spreads: BoardSide[];
  alt_totals: BoardSide[];
  team_totals: BoardSide[];
}

export interface BoardProp {
  player: string;
  player_id: string | null;
  team: string;
  stat_name: string;
  group: string;
  sides: [BoardSide, BoardSide] | null;
  alts: BoardSide[];
}

export interface BoardSlateGame {
  sport: BoardSport;
  game_id: string;
  away: string;
  home: string;
  commence_time: string | null;
  started: boolean;
}

export interface BoardGame extends BoardSlateGame {
  thin: boolean;
  periods: Partial<Record<BoardPeriodKey, BoardPeriod>>;
  props: BoardProp[];
}

/* Error detail strings the platform returns in the `detail` field. */
export const VIP_ERRORS = {
  403: [
    "no_claimed_capper",
    "seller_denylisted",
    "seller_inactive",
    "sport_not_eligible",
    "capper_hidden",
  ],
  400: [
    "terms_required",
    "price_out_of_bounds",
    "leg_missing_game",
    "unknown_sport",
    "bad_date",
    "unknown_stat_name",
    "selection_not_in_game",
  ],
  409: [
    "no_eligible_sport",
    "game_started",
    "game_start_unknown",
    "duplicate_pick",
  ],
  404: ["capper_not_found", "seller_not_found"],
} as const;
