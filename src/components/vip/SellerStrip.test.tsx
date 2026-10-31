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
    getVipSellerAccount: vi.fn().mockResolvedValue({ status: "onboarding", charges_enabled: false, stage: "needs_info" }),
  };
});
vi.mock("@/lib/vip/client", () => client);

import { SellerStrip } from "./SellerStrip";

const seller: VipSeller = { price_cents: 2500, founding: true, status: "active", preferred_book: "draftkings" };

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

  it("counts paused and canceling subscribers apart from active ones", async () => {
    client.getVipSellerSubscribers.mockResolvedValue({ subscribers: [
      { username: "a", since: null, renews: true, current_period_end: "2026-11-24T12:00:00Z", status: "active" },
      { username: "p", since: null, renews: false, current_period_end: null, status: "paused" },
      { username: "c", since: null, renews: false, current_period_end: "2026-11-20T12:00:00Z", status: "canceled" },
    ] });
    renderStrip();
    expect(await screen.findByText("1 paused")).toBeInTheDocument();
    expect(screen.getByText("1 canceling")).toBeInTheDocument();
    // $25 x 1 renewing x seller share: paused subscribers are not billed.
    expect(screen.getByText("$21.25")).toBeInTheDocument();
    // The list stays closed until asked for.
    expect(screen.queryByText("Paused")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Subscribers/ }));
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText(/^Renews Nov/)).toBeInTheDocument();
    expect(screen.getByText(/^Ends Nov/)).toBeInTheDocument();
  });

  it("reloads subscribers after stopping", async () => {
    client.getVipSellerSubscribers
      .mockResolvedValueOnce({ subscribers: [
        { username: "a", since: null, renews: true, current_period_end: null, status: "active" }] })
      .mockResolvedValue({ subscribers: [
        { username: "a", since: null, renews: false, current_period_end: null, status: "canceled" }] });
    client.stopVipSelling.mockResolvedValue({ status: "stopped", canceled: 1 });
    renderStrip();
    expect(await screen.findByText("$21.25")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop selling" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Stop selling" })[0]);
    expect(await screen.findByText("1 canceling")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("explains the pause when the subscriber list opens", async () => {
    client.getVipSellerSubscribers.mockResolvedValue({ subscribers: [
      { username: "a", since: null, renews: true, current_period_end: null, status: "active" }] });
    renderStrip();
    await screen.findByText("View ▾");
    fireEvent.click(screen.getByRole("button", { name: /^Subscribers/ }));
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

  it("a 200 that is not stopped shows an error", async () => {
    client.stopVipSelling.mockResolvedValue({ status: "active", canceled: 0 });
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Stop selling" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Stop selling" })[0]);
    expect(await screen.findByText("Could not stop selling. Try again.")).toBeInTheDocument();
  });

  it("pluralizes the confirm count and hides it while loading", async () => {
    client.getVipSellerSubscribers.mockResolvedValue({
      subscribers: [{ username: "a", since: null, renews: true, current_period_end: null }],
    });
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Stop selling" }));
    expect(await screen.findByText(/Your 1 current subscriber keeps/)).toBeInTheDocument();
  });

  it("shows no count before subscribers load", () => {
    client.getVipSellerSubscribers.mockReturnValue(new Promise(() => {}));
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Stop selling" }));
    expect(screen.getByText(/Your current subscribers keep/)).toBeInTheDocument();
  });

  it("a newer seller status from /me clears the local override", async () => {
    client.stopVipSelling.mockResolvedValue({ status: "stopped", canceled: 0 });
    const view = renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Stop selling" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Stop selling" })[0]);
    await screen.findByText(/You stopped selling\./);
    view.rerender(
      <SellerStrip seller={{ ...seller, status: "disabled" }} token="tok" paymentsEnabled onSaved={() => {}} />,
    );
    expect(screen.queryByText(/You stopped selling\./)).toBeNull();
    expect(screen.getByText(/turned off for your account/)).toBeInTheDocument();
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
