import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { VipCapperStatus } from "@/lib/vip/types";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));

const client = vi.hoisted(() => ({ getVipCapperStatus: vi.fn() }));
vi.mock("@/lib/vip/client", () => client);

import { CapperVipSection } from "./CapperVipSection";

const status: VipCapperStatus = {
  seller: { capper_id: 7, price_cents: 2500, founding: false, status: "active" },
  eligibility: [
    {
      sport: "MLB",
      eligible: true,
      eligible_since: "2026-10-01",
      units: 8.5,
      n_picks: 30,
      n_floor_picks: 25,
      run_date: "2026-10-27",
    },
  ],
  door_open: true,
  viewer: { subscribed: false, is_owner: false },
  vip_record: { n: 10, wins: 6, losses: 3, pushes: 1, units: 2.44 },
  locked: [],
};

// Tooltip reads (hover: none) on mount; jsdom has no matchMedia.
beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

describe("CapperVipSection", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "true");
    auth.value = { session: { access_token: "tok" } };
    client.getVipCapperStatus.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("section shows VIP record line when n > 0", async () => {
    client.getVipCapperStatus.mockResolvedValue(status);
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(await screen.findByText("VIP picks: 6-3-1, +2.4u")).toBeInTheDocument();
    expect(screen.getByText("Capper VIP")).toBeInTheDocument();
    expect(client.getVipCapperStatus).toHaveBeenCalledWith(7, "tok");
  });

  it("section hides VIP record line when n is 0", async () => {
    client.getVipCapperStatus.mockResolvedValue({
      ...status,
      vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 },
    });
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByText("Capper VIP");
    expect(screen.queryByText(/VIP picks:/)).toBeNull();
  });

  it("section record line drops pushes when there are none", async () => {
    client.getVipCapperStatus.mockResolvedValue({
      ...status,
      vip_record: { n: 9, wins: 6, losses: 3, pushes: 0, units: -1.05 },
    });
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(await screen.findByText("VIP picks: 6-3, -1.1u")).toBeInTheDocument();
  });

  it("section renders nothing and logs when the status call fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    client.getVipCapperStatus.mockRejectedValue(new Error("vip_404"));
    const { container } = render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    err.mockRestore();
  });

  it("section renders nothing when there is nothing to show", async () => {
    client.getVipCapperStatus.mockResolvedValue({
      ...status,
      seller: null,
      eligibility: [],
      locked: [],
      door_open: false,
    });
    const { container } = render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await waitFor(() => expect(client.getVipCapperStatus).toHaveBeenCalled());
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });

  it("section passes null token when anonymous", async () => {
    auth.value = { session: null };
    client.getVipCapperStatus.mockResolvedValue(status);
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByText("Capper VIP");
    expect(client.getVipCapperStatus).toHaveBeenCalledWith(7, null);
  });
});
