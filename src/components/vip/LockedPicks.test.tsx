import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-27T16:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("locked anonymous shows reveal time not selection", () => {
    render(
      <LockedPicks
        status={base({
          locked: [{ pick_id: 11, sport: "MLB", reveal_at: REVEAL, posted_at: pick.posted_at }],
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "VIP · 1 locked" })).toBeInTheDocument();
    expect(screen.getByText("Reveals at 7:05 PM ET")).toBeInTheDocument();
    expect(screen.getByText("MLB")).toBeInTheDocument();
    expect(screen.queryByText(/Yankees/)).toBeNull();
  });

  it("subscriber sees the pick, units and when it goes public", () => {
    render(
      <LockedPicks
        status={base({ viewer: { subscribed: true, is_owner: false }, locked: [pick] })}
      />,
    );
    expect(screen.getByRole("heading", { name: "VIP · 1 pick" })).toBeInTheDocument();
    expect(screen.getByText("Yankees -135")).toBeInTheDocument();
    expect(screen.getByText("2u")).toBeInTheDocument();
    expect(screen.queryByText(/Reveals/)).toBeNull();
    expect(screen.getByText(/^Public (at|on) /)).toBeInTheDocument();
  });

  it("subscriber sees a 3-leg parlay as one row with ticket odds and units", () => {
    const leg = (i: number, selection: string): VipLockedPick => ({
      ...pick,
      id: 20 + i,
      parlay_id: 99,
      parlay_leg_index: i,
      selection,
      odds_taken: i === 0 ? 600 : null,
      units: i === 0 ? 1 : null,
    });
    render(
      <LockedPicks
        status={base({
          viewer: { subscribed: true, is_owner: false },
          // Out of order on purpose: legs sort by parlay_leg_index.
          locked: [leg(2, "Rangers"), pick, leg(0, "Yankees ML"), leg(1, "Dodgers")],
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "VIP · 2 picks" })).toBeInTheDocument();
    expect(screen.getByText("3-leg parlay +600")).toBeInTheDocument();
    expect(screen.getByText("1u")).toBeInTheDocument();
    const legs = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(legs).toEqual(["Yankees ML", "Dodgers", "Rangers"]);
    expect(screen.getByText("Yankees -135")).toBeInTheDocument();
  });

  it("parlay legs keep their own odds when there is no combined price", () => {
    render(
      <LockedPicks
        status={base({
          viewer: { subscribed: false, is_owner: true },
          locked: [
            { ...pick, id: 30, parlay_id: 5, parlay_leg_index: 0, selection: "Mets", odds_taken: -120, units: 2 },
            { ...pick, id: 31, parlay_id: 5, parlay_leg_index: 1, selection: "Cubs", odds_taken: 110, units: null },
          ],
        })}
      />,
    );
    expect(screen.getByText("2-leg parlay")).toBeInTheDocument();
    expect(screen.getByText("2u")).toBeInTheDocument();
    expect(screen.getByText("Mets -120")).toBeInTheDocument();
    expect(screen.getByText("Cubs +110")).toBeInTheDocument();
  });

  it("anonymous header counts tickets not legs", () => {
    const posted = "2026-10-27T18:00:00.120Z";
    const sameSecond = "2026-10-27T18:00:00.870Z";
    render(
      <LockedPicks
        status={base({
          locked: [
            { pick_id: 1, sport: "MLB", reveal_at: REVEAL, posted_at: posted },
            { pick_id: 2, sport: "MLB", reveal_at: REVEAL, posted_at: sameSecond },
            { pick_id: 3, sport: "MLB", reveal_at: REVEAL, posted_at: posted },
            { pick_id: 4, sport: "MLB", reveal_at: REVEAL, posted_at: "2026-10-27T18:05:00Z" },
          ],
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "VIP · 2 locked" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Locked")).toHaveLength(2);
  });

  it("a pulled pick shows struck with a Pulled tag", () => {
    const status = base({ viewer: { subscribed: true, is_owner: false }, locked: [{ ...pick, pulled: true }] });
    render(<LockedPicks status={status} />);
    expect(screen.getByText("Pulled")).toBeInTheDocument();
    expect(screen.getByText(/Yankees/)).toHaveClass("line-through");
  });

  it("a fixed pick shows the original next to the change", () => {
    const original = {
      legs: [{ sport: "MLB", game_id: "776001", selection: "Red Sox", stat_name: "win", line: null,
               direction: null, player_name: null, odds_taken: 120 }],
      units: 1,
      combined_odds: null,
    };
    const status = base({ viewer: { subscribed: true, is_owner: false }, locked: [{ ...pick, original }] });
    render(<LockedPicks status={status} />);
    expect(screen.getByText(/^Original:/)).toBeInTheDocument();
    expect(screen.getByText("Red Sox +120 · 1u")).toHaveClass("line-through");
  });

  it("owner can pull an open pick from the list, two taps", async () => {
    const onPull = vi.fn().mockResolvedValue(undefined);
    const status = base({ viewer: { subscribed: false, is_owner: true },
                          locked: [{ ...pick, commence_time: "2026-10-28T23:05:00Z" }] });
    render(<LockedPicks status={status} onPull={onPull} />);
    fireEvent.click(screen.getByRole("button", { name: "Pull" }));
    fireEvent.click(screen.getByRole("button", { name: "Pull pick" }));
    await waitFor(() => expect(onPull).toHaveBeenCalledWith(11));
  });

  it("subscribers never see Pull", () => {
    const status = base({ viewer: { subscribed: true, is_owner: false }, locked: [pick] });
    render(<LockedPicks status={status} onPull={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Pull" })).toBeNull();
  });

  it("renders nothing with no locked picks", () => {
    const { container } = render(<LockedPicks status={base({})} />);
    expect(container).toBeEmptyDOMElement();
  });
});
