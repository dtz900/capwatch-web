import { describe, expect, it } from "vitest";
import type { VipCapperStatus, VipLockedPick } from "./types";
import {
  bestSport,
  cardPath,
  exclusivityFor,
  minutesBefore,
  postText,
  receiptTitle,
  shareUrl,
  xIntentUrl,
  type VipReceipt,
} from "./promote";

const status: VipCapperStatus = {
  seller: { price_cents: 1500, founding: false, status: "active" },
  eligibility: [
    { sport: "MLB", eligible: false, eligible_since: null, units: -3, n_picks: 40, n_floor_picks: 40, run_date: null },
    { sport: "NBA", eligible: true, eligible_since: "2026-10-01", units: 6.5, n_picks: 24, n_floor_picks: 24, run_date: null },
    { sport: "NFL", eligible: true, eligible_since: "2026-10-01", units: 4.2, n_picks: 60, n_floor_picks: 60, run_date: null },
  ],
  sport_field: { NBA: { qualified: 7, active: 93 }, NFL: { qualified: 22, active: 111 } },
  door_open: true,
  viewer: { subscribed: false, is_owner: true },
  vip_record: { n: 10, wins: 6, losses: 3, pushes: 1, units: 2.4 },
  locked: [],
};

const leg = (over: Partial<VipLockedPick> = {}): VipLockedPick => ({
  id: 1, sport: "NBA", market: "total", selection: "POR/UTAH", line: 232, odds_taken: -102, units: 1,
  posted_at: "2026-10-31T15:42:00Z", reveal_at: "2026-10-31T16:30:00Z", game_id: "1", parlay_id: null,
  parlay_leg_index: null, matchup: "POR @ UTAH", commence_time: "2026-10-31T16:00:00Z",
  stat_name: "total", direction: "over", ...over,
});

const receipt: VipReceipt = {
  ticket_id: "s1", sport: "NBA", posted_at: "2026-10-31T15:42:00Z", commence_time: "2026-10-31T16:00:00Z",
  odds: -102, units: 1, profit_units: 0.98, legs: [leg()],
};

const DASHES = /—|–|--/;

describe("promote", () => {
  it("leads with the best eligible sport and its 1 of N count", () => {
    expect(bestSport(status.eligibility)?.sport).toBe("NBA");
    expect(exclusivityFor(status, "NBA")).toBe("1 of 7 NBA cappers");
  });

  it("writes true post text for each card, never with dashes", () => {
    const brand = postText("brand", { status });
    const launch = postText("launch", { status });
    const record = postText("record", { status });
    const rec = postText("receipt", { status, receipt });
    expect(brand).toBe(
      "I'm 1 of 7 NBA cappers eligible to sell VIP on @tailslips. Every pick timestamped before the game and graded after.",
    );
    expect(launch).toBe(
      "My VIP is open on @tailslips. NBA last 30 days: +6.5u on 24 picks, every one verified. $15/mo, picks hit your inbox before the game.",
    );
    expect(record).toBe("VIP is 6-3-1, +2.4u. Every pick timestamped before the game on @tailslips, wins and losses.");
    expect(rec).toBe(
      "VIP cashed. POR/UTAH Over 232 (-102), posted 18 minutes before the game and verified on @tailslips. Next one goes to subscribers first.",
    );
    for (const t of [brand, launch, record, rec]) expect(t).not.toMatch(DASHES);
  });

  it("has nothing to say without the facts behind it", () => {
    const none = { ...status, eligibility: status.eligibility.map((e) => ({ ...e, eligible: false })) };
    expect(postText("brand", { status: none })).toBeNull();
    expect(postText("launch", { status: none })).toBeNull();
    expect(postText("record", { status: { ...status, vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 } } })).toBeNull();
    expect(postText("receipt", { status, receipt: null })).toBeNull();
  });

  it("names a parlay by its legs and measures lead time", () => {
    expect(receiptTitle({ ...receipt, legs: [leg(), leg({ id: 2 })] })).toBe("2-leg parlay");
    expect(minutesBefore(receipt)).toBe(18);
    expect(minutesBefore({ ...receipt, commence_time: null })).toBeNull();
  });

  it("builds card, share and X links", () => {
    expect(cardPath("zz_viptest", "receipt", "s1")).toBe("/cappers/zz_viptest/vip-card/receipt?t=s1");
    expect(cardPath("zz_viptest", "brand", "s1")).toBe("/cappers/zz_viptest/vip-card/brand");
    expect(shareUrl("zz_viptest", "launch")).toBe("https://tailslips.com/cappers/zz_viptest/promo/launch");
    expect(xIntentUrl("hi there", "https://t.co/x")).toBe("https://x.com/intent/post?text=hi+there&url=https%3A%2F%2Ft.co%2Fx");
  });
});
