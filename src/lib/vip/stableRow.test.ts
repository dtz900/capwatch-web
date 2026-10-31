import { describe, expect, it } from "vitest";
import { vipOnlyRow } from "./stableRow";
import type { VipSubscription } from "./types";

const sub: VipSubscription = {
  capper: { id: 325, handle: "zz_viptest", display_name: "VIP Test Capper", profile_image_url: null },
  status: "active",
  source: "stripe",
  current_period_end: "2026-11-30T00:00:00Z",
  paused_at: null,
  pause_reason: null,
  locked: [],
};

describe("vipOnlyRow", () => {
  it("builds a stable row from the subscription's capper with an empty record", () => {
    const row = vipOnlyRow(sub);
    expect(row).toMatchObject({
      capper_id: "325",
      handle: "zz_viptest",
      display_name: "VIP Test Capper",
      picks_count: 0,
      units_profit: 0,
    });
  });

  it("is null without a subscription (a plain tail off the board stays dropped)", () => {
    expect(vipOnlyRow(undefined)).toBeNull();
  });
});
