import { describe, expect, it } from "vitest";
import { exclusivityLine, formatRevealTime, joinSports, vipHeadline } from "./format";
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
    seller: { price_cents: 2500, founding: false, status: "active" },
    eligibility: [el({})],
    door_open: true,
    viewer: { subscribed: false, is_owner: false },
    vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 },
    locked: [],
    ...over,
  };
}

describe("vipHeadline", () => {
  it("any eligible sport reads VIP Eligible, seller or not", () => {
    expect(vipHeadline(st({}))).toBe("VIP Eligible");
    expect(vipHeadline(st({ seller: null, door_open: false }))).toBe("VIP Eligible");
  });

  it("nothing eligible", () => {
    expect(vipHeadline(st({ door_open: false, eligibility: [el({ eligible: false })] }))).toBe(
      "Not VIP eligible right now",
    );
  });

  it("joinSports", () => {
    expect(joinSports(["MLB", "NBA", "NFL"])).toBe("MLB, NBA and NFL");
  });
});

describe("exclusivityLine", () => {
  it("places the capper among the eligible cappers per sport", () => {
    expect(exclusivityLine(st({ sport_field: { NBA: { qualified: 1, active: 91 } } }))).toBe(
      "1 of 1 eligible NBA cappers",
    );
    expect(
      exclusivityLine(
        st({
          eligibility: [el({}), el({ sport: "NFL" })],
          sport_field: { NBA: { qualified: 4, active: 91 }, NFL: { qualified: 2, active: 110 } },
        }),
      ),
    ).toBe("1 of 4 eligible NBA cappers · 1 of 2 eligible NFL cappers");
  });

  it("null with no counts or nothing eligible", () => {
    expect(exclusivityLine(st({}))).toBeNull();
    expect(
      exclusivityLine(st({ eligibility: [el({ eligible: false })], sport_field: { NBA: { qualified: 3, active: 91 } } })),
    ).toBeNull();
  });
});
