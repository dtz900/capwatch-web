import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { VipTab } from "./VipTab";
import type { VipSubscription } from "@/lib/vip/types";

const getVipSubscriptions = vi.fn();
vi.mock("@/lib/vip/client", () => ({
  getVipSubscriptions: (...a: unknown[]) => getVipSubscriptions(...a),
}));
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ session: { access_token: "tok" } }),
}));

function pick(id: number) {
  return {
    id,
    sport: "MLB",
    market: "moneyline",
    selection: `Team ${id}`,
    line: null,
    odds_taken: -110,
    units: 1,
    posted_at: "2026-10-27T18:00:00Z",
    reveal_at: "2026-10-27T23:00:00Z",
    game_id: null,
    parlay_id: null,
    parlay_leg_index: null,
    stat_name: null,
    direction: null,
    player_name: null,
  };
}

function sub(over: Partial<VipSubscription> & { handle: string }): VipSubscription {
  const { handle, ...rest } = over;
  return {
    capper: { id: 1, handle, display_name: `Name ${handle}`, profile_image_url: null },
    status: "active",
    source: "stripe",
    current_period_end: null,
    paused_at: null,
    pause_reason: null,
    locked: [],
    ...rest,
  };
}

beforeEach(() => {
  getVipSubscriptions.mockReset();
});

describe("VipTab", () => {
  it("renders one card per subscription", async () => {
    getVipSubscriptions.mockResolvedValue({
      subscriptions: [
        sub({ handle: "alpha", locked: [pick(1), pick(2)] }),
        sub({ handle: "bravo", locked: [pick(3)] }),
      ],
    });
    render(<VipTab />);
    expect(await screen.findByText("@alpha")).toBeInTheDocument();
    expect(screen.getByText("@bravo")).toBeInTheDocument();
    expect(screen.getByText("VIP · 2 locked")).toBeInTheDocument();
    expect(screen.getByText("VIP · 1 locked")).toBeInTheDocument();
    expect(screen.getAllByText("Active")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /alpha/ })).toHaveAttribute("href", "/cappers/alpha");
    expect(getVipSubscriptions).toHaveBeenCalledWith("tok");
  });

  it("paused card shows reason", async () => {
    getVipSubscriptions.mockResolvedValue({
      subscriptions: [
        sub({ handle: "cold1", status: "paused", pause_reason: "cold", locked: [pick(1)] }),
        sub({ handle: "quiet1", status: "paused", pause_reason: "silent" }),
        sub({ handle: "gone1", status: "canceled" }),
      ],
    });
    render(<VipTab />);
    expect(await screen.findByText("Paused: cold")).toBeInTheDocument();
    expect(screen.getByText("Paused: quiet")).toBeInTheDocument();
    expect(screen.getByText("Canceled")).toBeInTheDocument();
    expect(screen.getAllByText("No picks while paused.")).toHaveLength(2);
    expect(screen.getByText("No picks after cancel.")).toBeInTheDocument();
    expect(screen.queryByText(/locked/)).not.toBeInTheDocument();
  });

  it("groups a locked parlay into one ticket", async () => {
    getVipSubscriptions.mockResolvedValue({
      subscriptions: [
        sub({
          handle: "alpha",
          locked: [
            { ...pick(1), parlay_id: 9, parlay_leg_index: 0, odds_taken: 450, units: 1 },
            { ...pick(2), parlay_id: 9, parlay_leg_index: 1, odds_taken: null, units: null },
            { ...pick(3), parlay_id: 9, parlay_leg_index: 2, odds_taken: null, units: null },
          ],
        }),
      ],
    });
    render(<VipTab />);
    expect(await screen.findByText("VIP · 1 locked")).toBeInTheDocument();
    expect(screen.getByText("3-leg parlay +450 · 1u")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("empty state copy", async () => {
    getVipSubscriptions.mockResolvedValue({ subscriptions: [] });
    render(<VipTab />);
    expect(await screen.findByText("You are not subscribed to any capper yet.")).toBeInTheDocument();
  });

  it("shows an error message when the load fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getVipSubscriptions.mockRejectedValue(new Error("vip_404"));
    render(<VipTab />);
    await waitFor(() =>
      expect(screen.getByText("Could not load your subscriptions.")).toBeInTheDocument(),
    );
  });
});
