import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { VipCapperStatus } from "@/lib/vip/types";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));

const client = vi.hoisted(() => {
  class VipApiError extends Error {
    readonly status: number;
    readonly detail: string;
    constructor(status: number, detail: string) {
      super(`vip_${status}`);
      this.status = status;
      this.detail = detail;
    }
  }
  return {
    getVipCapperStatus: vi.fn(),
    getVipMe: vi.fn(),
    patchVipSeller: vi.fn(),
    postVipSeller: vi.fn(),
    postVipPick: vi.fn(),
    searchVipGames: vi.fn(),
    VipApiError,
  };
});
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

describe("CapperVipSection", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "true");
    auth.value = { session: { access_token: "tok" } };
    client.getVipCapperStatus.mockReset();
    client.getVipMe.mockReset();
    client.patchVipSeller.mockReset();
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
    client.getVipCapperStatus.mockRejectedValue(new client.VipApiError(500, "boom"));
    const { container } = render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    err.mockRestore();
  });

  it("section treats 404 as quiet: renders nothing, no console.error", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    client.getVipCapperStatus.mockRejectedValue(new client.VipApiError(404, "Not Found"));
    const { container } = render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await waitFor(() => expect(client.getVipCapperStatus).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(err).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
    err.mockRestore();
  });

  it("section clears the previous payload when the token changes", async () => {
    client.getVipCapperStatus.mockResolvedValueOnce(status);
    const { rerender } = render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByText("Capper VIP");
    let resolveAnon: (s: VipCapperStatus) => void = () => {};
    client.getVipCapperStatus.mockReturnValueOnce(
      new Promise<VipCapperStatus>((r) => {
        resolveAnon = r;
      }),
    );
    auth.value = { session: null };
    rerender(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(screen.queryByText("Capper VIP")).toBeNull();
    resolveAnon(status);
    expect(await screen.findByText("Capper VIP")).toBeInTheDocument();
    expect(client.getVipCapperStatus).toHaveBeenLastCalledWith(7, null);
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

  it("section shows the owner panel only to the claimed capper", async () => {
    client.getVipCapperStatus.mockResolvedValue(status);
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByText("Capper VIP");
    expect(screen.queryByText("Your VIP")).toBeNull();
    expect(client.getVipMe).not.toHaveBeenCalled();
  });

  it("section owner panel shows the price line and saves a new price", async () => {
    auth.value = { session: { access_token: "tok" }, capper: { id: 7, handle: "moneyplayzz" } };
    client.getVipCapperStatus.mockResolvedValue(status);
    client.getVipMe.mockResolvedValue({
      capper: { id: 7, handle: "moneyplayzz" },
      seller: status.seller,
      eligibility: [],
      can_post_sports: ["MLB"],
    });
    client.patchVipSeller.mockResolvedValue({ ...status.seller, price_cents: 3000 });
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(await screen.findByText("Your VIP")).toBeInTheDocument();
    expect(screen.getByText(/Selling at \$25\/mo ·/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText("Monthly price (USD)"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(client.patchVipSeller).toHaveBeenCalledWith({ price_cents: 3000 }, "tok"),
    );
    await waitFor(() => expect(client.getVipMe).toHaveBeenCalledTimes(2));
    expect(client.getVipCapperStatus).toHaveBeenCalledTimes(2);
  });

  it("section owner with nothing public yet still sees start selling", async () => {
    auth.value = { session: { access_token: "tok" }, capper: { id: 7, handle: "moneyplayzz" } };
    client.getVipCapperStatus.mockResolvedValue({
      ...status,
      seller: null,
      eligibility: [],
      locked: [],
      door_open: false,
    });
    client.getVipMe.mockResolvedValue({
      capper: { id: 7, handle: "moneyplayzz" },
      seller: null,
      eligibility: [],
      can_post_sports: [],
    });
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(await screen.findByRole("button", { name: "Start selling" })).toBeDisabled();
    expect(screen.queryByText("Capper VIP")).toBeNull();
  });
});
