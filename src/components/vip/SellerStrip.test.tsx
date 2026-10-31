import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { VipSeller } from "@/lib/vip/types";

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
    VipApiError,
    getVipSellerSubscribers: vi.fn(),
    patchVipSeller: vi.fn(),
    stopVipSelling: vi.fn(),
    startVipSelling: vi.fn(),
    startVipOnboarding: vi.fn(),
    getVipSellerAccount: vi.fn(),
  };
});
vi.mock("@/lib/vip/client", () => client);

import { SellerStrip } from "./SellerStrip";

const seller: VipSeller = { capper_id: 7, price_cents: 2500, founding: true, status: "active", preferred_book: "draftkings" };

function renderStrip(over: Partial<VipSeller> = {}, paymentsEnabled = true, onSaved = () => {}) {
  return render(
    <SellerStrip seller={{ ...seller, ...over }} token="tok" paymentsEnabled={paymentsEnabled} onSaved={onSaved} />,
  );
}

describe("SellerStrip", () => {
  beforeEach(() => {
    client.stopVipSelling.mockReset();
    client.getVipSellerSubscribers.mockReset();
    client.getVipSellerSubscribers.mockResolvedValue({ subscribers: [] });
  });

  it("explains the pause under Subscribers", () => {
    renderStrip();
    expect(
      screen.getByText(
        "If you go cold, your subscribers stop being charged and their billing dates move out by the days you couldn't post.",
      ),
    ).toBeInTheDocument();
  });

  it("stop selling confirm calls API and shows stopped banner", async () => {
    client.stopVipSelling.mockResolvedValue({ status: "stopped", canceled: 2 });
    const onSaved = vi.fn();
    renderStrip({}, true, onSaved);
    fireEvent.click(screen.getByRole("button", { name: "Stop selling" }));
    expect(screen.getByText("Stop selling VIP?")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Stop selling" })[0]);
    expect(await screen.findByText(/You stopped selling\./)).toBeInTheDocument();
    expect(client.stopVipSelling).toHaveBeenCalledWith("tok");
    expect(onSaved).toHaveBeenCalled();
    expect(screen.queryByText("Stop selling VIP?")).toBeNull();
  });

  it("keep selling closes the panel", () => {
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Stop selling" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep selling" }));
    expect(screen.queryByText("Stop selling VIP?")).toBeNull();
    expect(client.stopVipSelling).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Stop selling" })).toBeInTheDocument();
  });

  it("stop_incomplete shows retry copy and keeps the panel usable", async () => {
    client.stopVipSelling.mockRejectedValue(new client.VipApiError(502, "stop_incomplete"));
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Stop selling" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Stop selling" })[0]);
    expect(await screen.findByText("Some subscriptions didn't cancel yet. Try again.")).toBeInTheDocument();
    expect(screen.queryByText(/You stopped selling\./)).toBeNull();
    expect(screen.getByText("Stop selling VIP?")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Stop selling" })[0]).toBeEnabled();
  });

  it("stop is available while payments are off, hidden when stopped or disabled", () => {
    const first = renderStrip({ status: "onboarding" }, false);
    expect(screen.getByRole("button", { name: "Stop selling" })).toBeInTheDocument();
    first.unmount();
    const second = renderStrip({ status: "stopped" });
    expect(screen.queryByRole("button", { name: "Stop selling" })).toBeNull();
    second.unmount();
    renderStrip({ status: "disabled" });
    expect(screen.queryByRole("button", { name: "Stop selling" })).toBeNull();
  });
});
