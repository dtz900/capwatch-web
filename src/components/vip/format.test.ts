import { describe, expect, it } from "vitest";
import { eligibilityGap, formatRevealTime, joinSports, vipHeadline } from "./format";
import type { VipCapperStatus, VipEligibility } from "@/lib/vip/types";

describe("formatRevealTime", () => {
  const now = new Date("2026-10-27T16:00:00Z"); // Tue noon ET

  it("same ET day shows the time only", () => {
    expect(formatRevealTime("2026-10-27T23:05:00Z", now)).toBe("7:05 PM ET");
  });

  it("another ET day leads with the weekday", () => {
    expect(formatRevealTime("2026-10-28T23:05:00Z", now)).toBe("Wed 7:05 PM ET");
    // 01:30Z on the 28th is still Tuesday evening in ET.
    expect(formatRevealTime("2026-10-28T01:30:00Z", now)).toBe("9:30 PM ET");
  });
});

function el(over: Partial<VipEligibility>): VipEligibility {
  return {
    sport: "NBA",
    eligible: true,
    eligible_since: null,
    units: 5,
    n_picks: 25,
    n_floor_picks: 25,
    run_date: null,
    ...over,
  };
}

function st(over: Partial<VipCapperStatus>): VipCapperStatus {
  return {
    seller: { capper_id: 1, price_cents: 2500, founding: false, status: "active" },
    eligibility: [el({})],
    door_open: true,
    viewer: { subscribed: false, is_owner: false },
    vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 },
    locked: [],
    ...over,
  };
}

describe("vipHeadline", () => {
  it("seller with open door lists eligible sports", () => {
    expect(vipHeadline(st({}))).toBe("Selling NBA VIP picks");
    expect(
      vipHeadline(st({ eligibility: [el({}), el({ sport: "NFL" }), el({ sport: "MLB", eligible: false })] })),
    ).toBe("Selling NBA and NFL VIP picks");
  });

  it("seller with nothing eligible is not selling", () => {
    expect(vipHeadline(st({ door_open: false, eligibility: [el({ eligible: false })] }))).toBe(
      "Not selling right now",
    );
  });

  it("no seller: eligible or not eligible yet", () => {
    expect(vipHeadline(st({ seller: null, door_open: false }))).toBe("Eligible to sell NBA VIP picks");
    expect(
      vipHeadline(st({ seller: null, door_open: false, eligibility: [el({ eligible: false })] })),
    ).toBe("Not eligible to sell yet");
  });

  it("joinSports", () => {
    expect(joinSports(["MLB", "NBA", "NFL"])).toBe("MLB, NBA and NFL");
  });
});

describe("eligibilityGap", () => {
  it("below floor counts picks left, singular at one, plain floor when unknown", () => {
    expect(eligibilityGap(el({ eligible: false, reason: "below_floor", n_floor_picks: 3 }))).toBe(
      "17 more picks to qualify",
    );
    expect(eligibilityGap(el({ eligible: false, reason: "below_floor", n_floor_picks: 19 }))).toBe(
      "1 more pick to qualify",
    );
    expect(eligibilityGap(el({ eligible: false, reason: "below_floor", n_floor_picks: null }))).toBe(
      "20 picks to qualify",
    );
  });

  it("negative shows distance in units; eligible has no gap", () => {
    expect(eligibilityGap(el({ eligible: false, reason: "negative", units: -11.42 }))).toBe(
      "11.4u from eligible",
    );
    expect(eligibilityGap(el({}))).toBeNull();
  });
});
