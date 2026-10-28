import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LockedPicks } from "./LockedPicks";
import type { VipCapperStatus, VipLockedPick } from "@/lib/vip/types";

const REVEAL = "2026-10-27T23:05:00Z"; // 7:05 PM ET

function base(over: Partial<VipCapperStatus>): VipCapperStatus {
  return {
    seller: { capper_id: 7, price_cents: 2500, founding: false, status: "active" },
    eligibility: [],
    door_open: true,
    viewer: { subscribed: false, is_owner: false },
    vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 },
    locked: [],
    ...over,
  };
}

const pick: VipLockedPick = {
  id: 11,
  sport: "MLB",
  market: "ml",
  selection: "Yankees",
  line: null,
  odds_taken: -135,
  units: 2,
  posted_at: "2026-10-27T18:00:00Z",
  reveal_at: REVEAL,
  game_id: "776001",
  parlay_id: null,
  parlay_leg_index: null,
  stat_name: null,
  direction: null,
  player_name: null,
};

describe("LockedPicks", () => {
  it("locked anonymous shows reveal time not selection", () => {
    render(
      <LockedPicks
        status={base({
          locked: [{ pick_id: 11, sport: "MLB", reveal_at: REVEAL, posted_at: pick.posted_at }],
        })}
      />,
    );
    expect(screen.getByText("VIP · 1 locked")).toBeInTheDocument();
    expect(screen.getByText("Reveals at 7:05 PM ET")).toBeInTheDocument();
    expect(screen.getByText("MLB")).toBeInTheDocument();
    expect(screen.queryByText(/Yankees/)).toBeNull();
  });

  it("locked subscriber shows selection", () => {
    render(
      <LockedPicks
        status={base({ viewer: { subscribed: true, is_owner: false }, locked: [pick] })}
      />,
    );
    expect(screen.getByText("VIP · 1 locked")).toBeInTheDocument();
    expect(screen.getByText("NYY ML -135")).toBeInTheDocument();
    expect(screen.getByText("2u")).toBeInTheDocument();
    expect(screen.queryByText(/Reveals at/)).toBeNull();
  });

  it("renders nothing with no locked picks", () => {
    const { container } = render(<LockedPicks status={base({})} />);
    expect(container).toBeEmptyDOMElement();
  });
});
