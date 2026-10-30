/* LOCAL DESIGN DEMO ONLY. Do not commit. With NEXT_PUBLIC_VIP_FIXTURES=true,
 * ?vipdemo=locked (anonymous) or ?vipdemo=sub (subscriber) on a real capper
 * profile injects demo VIP picks so the locked/unlocked views can be designed
 * without writing picks to prod. */
import type {
  VipCapperStatus,
  VipLockedPick,
  VipLockedSummary,
  VipSubscription,
} from "@/lib/vip/types";

const at = (iso: string) => new Date(iso).toISOString();
const POSTED = new Date(Date.now() - 2 * 3600_000).toISOString();

const PICKS: VipLockedPick[] = [
  {
    id: -1,
    sport: "NFL",
    market: "spread",
    selection: "Bills -3.5",
    line: -3.5,
    odds_taken: -110,
    units: 2,
    posted_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    reveal_at: at("2026-11-01T17:30:00Z"),
    game_id: "demo1",
    matchup: "BUF @ MIA",
    commence_time: at("2026-11-01T17:00:00Z"),
    parlay_id: null,
    parlay_leg_index: null,
  },
  {
    id: -2,
    sport: "NFL",
    market: "ml",
    selection: "Lions ML",
    line: null,
    odds_taken: 315,
    units: 1,
    posted_at: POSTED,
    reveal_at: at("2026-11-01T17:30:00Z"),
    game_id: "demo2",
    matchup: "DET @ GB",
    commence_time: at("2026-11-01T17:00:00Z"),
    parlay_id: -9,
    parlay_leg_index: 0,
  },
  {
    id: -3,
    sport: "NFL",
    market: "total",
    selection: "Over 47.5",
    line: 47.5,
    odds_taken: null,
    units: null,
    posted_at: POSTED,
    reveal_at: at("2026-11-01T17:30:00Z"),
    game_id: "demo3",
    matchup: "KC @ DEN",
    commence_time: at("2026-11-01T17:00:00Z"),
    parlay_id: -9,
    parlay_leg_index: 1,
  },
  {
    id: -4,
    sport: "NFL",
    market: "total",
    selection: "Under 44.5",
    line: 44.5,
    odds_taken: -105,
    units: 1.5,
    posted_at: new Date(Date.now() - 3600_000).toISOString(),
    reveal_at: at("2026-11-02T01:50:00Z"),
    game_id: "demo4",
    matchup: "PHI @ DAL",
    commence_time: at("2026-11-02T01:20:00Z"),
    parlay_id: null,
    parlay_leg_index: null,
  },
];

export function applyVipDemo(s: VipCapperStatus): VipCapperStatus {
  if (
    process.env.NEXT_PUBLIC_VIP_FIXTURES !== "true" ||
    typeof window === "undefined"
  )
    return s;
  const mode = new URLSearchParams(window.location.search).get("vipdemo");
  if (mode === "sub") {
    return {
      ...s,
      viewer: { ...s.viewer, subscribed: true, is_owner: false },
      locked: PICKS,
    };
  }
  if (mode === "locked") {
    return {
      ...s,
      viewer: { ...s.viewer, subscribed: false, is_owner: false },
      locked: PICKS.map((p) => ({
        pick_id: p.id,
        sport: p.sport,
        reveal_at: p.reveal_at,
        posted_at: p.posted_at,
      })),
    };
  }
  return s;
}

export function demoLockedSummaries(): VipLockedSummary[] {
  return PICKS.map((p) => ({
    pick_id: p.id,
    sport: p.sport,
    reveal_at: p.reveal_at,
    posted_at: p.posted_at,
  }));
}

const DAY = 24 * 3600_000;
const cap = (
  id: number,
  handle: string,
  name: string,
  img: string | null = null,
) => ({
  id,
  handle,
  display_name: name,
  profile_image_url: img,
});

/** ?vipdemo=tails on /my-tails: demo subscriptions for the VIP tab. */
export function demoSubscriptions(): VipSubscription[] | null {
  if (
    process.env.NEXT_PUBLIC_VIP_FIXTURES !== "true" ||
    typeof window === "undefined"
  )
    return null;
  if (new URLSearchParams(window.location.search).get("vipdemo") !== "tails")
    return null;
  return demoSubscriptionList();
}

/** Server-safe demo list (the caller checks the flag and the query). */
export function demoSubscriptionList(): VipSubscription[] {
  const end = (d: number) => new Date(Date.now() + d * DAY).toISOString();
  return [
    {
      capper: cap(
        1,
        "luckyluke_hits",
        "Lucky Luke",
        "https://pbs.twimg.com/profile_images/2091532667326001152/zBydkX7s.jpg",
      ),
      status: "active",
      source: "stripe",
      current_period_end: end(20),
      paused_at: null,
      pause_reason: null,
      expired: false,
      locked: PICKS,
    },
    {
      capper: cap(
        2,
        "outoflinebets",
        "Out of Line Bets",
        "https://pbs.twimg.com/profile_images/1798808867263926272/PIuEm69s.jpg",
      ),
      status: "canceled",
      source: "stripe",
      current_period_end: end(6),
      paused_at: null,
      pause_reason: null,
      expired: false,
      locked: [PICKS[3]],
    },
    {
      capper: cap(
        3,
        "moneyplayzz",
        "Moneyplayzz",
        "https://pbs.twimg.com/profile_images/2025804170817609728/cOn3RAcX.jpg",
      ),
      status: "paused",
      source: "stripe",
      current_period_end: end(12),
      paused_at: end(-2),
      pause_reason: "silent",
      expired: false,
      locked: [],
    },
  ];
}
