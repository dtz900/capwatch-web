"use client";

import type { ReactNode } from "react";
import { CapperVipView } from "@/components/vip/CapperVipSection";
import { OwnerPanelView } from "@/components/vip/OwnerPanel";
import { VipSubscriptionCards } from "@/components/my-tails/VipTab";
import type {
  VipCapperStatus,
  VipEligibility,
  VipLockedPick,
  VipMe,
  VipSubscription,
} from "@/lib/vip/types";

const HOUR = 3_600_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const POSTED = iso(-2 * HOUR);
const REVEAL = iso(5 * HOUR);
const noop = () => {};

const ELIGIBLE: VipEligibility = {
  sport: "MLB",
  eligible: true,
  eligible_since: "2026-10-01",
  units: 8.4,
  n_picks: 31,
  n_floor_picks: 27,
  run_date: "2026-10-27",
};

function leg(
  id: number,
  idx: number,
  selection: string,
  market: string,
  over: Partial<VipLockedPick> = {},
): VipLockedPick {
  return {
    id,
    sport: "MLB",
    market,
    selection,
    line: null,
    odds_taken: null,
    units: null,
    posted_at: POSTED,
    reveal_at: REVEAL,
    game_id: `77600${id}`,
    parlay_id: 900,
    parlay_leg_index: idx,
    ...over,
  };
}

/* 3-leg parlay at combined +595 (price and units on leg 0, as stored) plus one straight. */
const PARLAY: VipLockedPick[] = [
  leg(101, 0, "Yankees ML", "ml", { odds_taken: 595, units: 1 }),
  leg(102, 1, "Dodgers -1.5", "spread", { line: -1.5 }),
  leg(103, 2, "Under 8.5", "total", { line: 8.5 }),
];
const STRAIGHT: VipLockedPick = {
  // Posted earlier than the parlay; the anonymous view groups by post time.
  ...leg(104, 0, "Mets", "ml", { odds_taken: -135, units: 2, posted_at: iso(-3 * HOUR) }),
  parlay_id: null,
  parlay_leg_index: null,
};

const BASE: VipCapperStatus = {
  seller: { capper_id: 7, price_cents: 2500, founding: true, status: "active" },
  eligibility: [ELIGIBLE],
  door_open: true,
  viewer: { subscribed: true, is_owner: false },
  vip_record: { n: 14, wins: 9, losses: 4, pushes: 1, units: 5.62 },
  locked: [...PARLAY, STRAIGHT],
};

const SUBSCRIBER = BASE;
const ANONYMOUS: VipCapperStatus = {
  ...BASE,
  viewer: { subscribed: false, is_owner: false },
  locked: [...PARLAY, STRAIGHT].map((p) => ({
    pick_id: p.id,
    sport: p.sport,
    reveal_at: p.reveal_at,
    posted_at: p.posted_at,
  })),
};

const OWNER_NO_SELLER: VipMe = {
  capper: { id: 7, handle: "moneyplayzz" },
  seller: null,
  eligibility: [{ sport: "MLB", eligible: false, eligible_since: null, fail_streak: 2 }],
  can_post_sports: [],
};
const OWNER_SELLER: VipMe = {
  capper: { id: 7, handle: "moneyplayzz" },
  seller: BASE.seller,
  eligibility: [{ sport: "MLB", eligible: true, eligible_since: "2026-10-01", fail_streak: 0 }],
  can_post_sports: ["MLB"],
};

function capper(id: number, handle: string, name: string) {
  return { id, handle, display_name: name, profile_image_url: null };
}
const SUBSCRIPTIONS: VipSubscription[] = [
  {
    capper: capper(7, "moneyplayzz", "Money Playzz"),
    status: "active",
    source: "stripe",
    current_period_end: iso(20 * 24 * HOUR),
    paused_at: null,
    pause_reason: null,
    locked: PARLAY,
  },
  {
    capper: capper(8, "coldstreak", "Cold Streak"),
    status: "paused",
    source: "stripe",
    current_period_end: iso(10 * 24 * HOUR),
    paused_at: iso(-24 * HOUR),
    pause_reason: "cold",
    locked: [],
  },
  {
    capper: capper(9, "gonecapper", "Gone Capper"),
    status: "canceled",
    source: "stripe",
    current_period_end: null,
    paused_at: null,
    pause_reason: null,
    locked: [],
  },
];

function Scenario({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-muted)]">
        {label}
      </h2>
      {children}
    </section>
  );
}

export function VipFixtures() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 flex flex-col gap-10">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Capper VIP fixtures</h1>
      <Scenario label="(a) Profile section, subscriber: 3-leg parlay + straight">
        <CapperVipView status={SUBSCRIBER} handle="moneyplayzz" />
      </Scenario>
      <Scenario label="(b) Profile section, anonymous: summary rows">
        <CapperVipView status={ANONYMOUS} handle="moneyplayzz" />
      </Scenario>
      <Scenario label="(c1) Owner, no seller, nothing eligible">
        <OwnerPanelView me={OWNER_NO_SELLER} onRefresh={noop} onPosted={noop} />
      </Scenario>
      <Scenario label="(c2) Owner seller with the composer">
        <OwnerPanelView me={OWNER_SELLER} onRefresh={noop} onPosted={noop} composerToken="fixture" />
      </Scenario>
      <Scenario label="(d) My Tails VIP tab: active, paused (cold), canceled">
        <VipSubscriptionCards subscriptions={SUBSCRIPTIONS} />
      </Scenario>
    </main>
  );
}
