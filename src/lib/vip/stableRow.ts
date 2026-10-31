import type { CapperRow } from "@/lib/types";
import type { VipSubscription } from "./types";

/** Stable row for a subscribed capper with no season leaderboard row: the
 *  subscription's identity with an empty record. */
export function vipOnlyRow(sub: VipSubscription | undefined): CapperRow | null {
  if (!sub) return null;
  return {
    capper_id: String(sub.capper.id),
    handle: sub.capper.handle,
    display_name: sub.capper.display_name,
    tier: null,
    activity_status: "active",
    is_claimed: true,
    follower_count: null,
    profile_image_url: sub.capper.profile_image_url,
    has_paid_program: false,
    picks_count: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    win_rate: 0,
    units_profit: 0,
    roi_pct: 0,
    clv_avg: null,
    current_streak: 0,
    bet_type_breakdown: {},
    biggest_win: null,
    tracked_since: null,
    tweets_parsed: 0,
    parlay_share: 0,
    deleted_picks_count: 0,
    live_picks_count: 0,
    last_picks: [],
  };
}
