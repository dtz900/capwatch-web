export type VipSport = "MLB" | "NFL" | "NBA";

export interface VipSeller {
  capper_id: number;
  price_cents: number;
  founding: boolean;
  status: string;
}

export interface VipEligibility {
  sport: VipSport | string;
  eligible: boolean;
  eligible_since: string | null;
  units: number | null;
  n_picks: number | null;
  n_floor_picks: number | null;
  run_date: string | null;
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
  stat_name: string | null;
  direction: string | null;
  player_name: string | null;
}

export function isLockedPick(
  x: VipLockedSummary | VipLockedPick,
): x is VipLockedPick {
  return "selection" in x;
}

export interface VipCapperStatus {
  seller: VipSeller | null;
  eligibility: VipEligibility[];
  door_open: boolean;
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
}

export interface VipPickBody {
  legs: ManualLegInput[];
  units?: number;
  combined_odds?: number | null;
  sport: string;
  is_live?: boolean;
}

export interface VipPickResult {
  ok: true;
  created_pick_ids: number[];
  parlay_id: number | null;
  reveal_at: string;
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
  ],
  409: ["no_eligible_sport", "game_started", "game_start_unknown"],
  404: ["capper_not_found", "seller_not_found"],
} as const;
