import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const client = vi.hoisted(() => ({
  startVipOnboarding: vi.fn(),
  getVipSellerAccount: vi.fn(),
  startVipSelling: vi.fn(),
}));
vi.mock("@/lib/vip/client", () => client);

import { SellerStatusBanner } from "./SellerStatusBanner";

function setLocation(search: string) {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    value: { search, assign, pathname: "/cappers/moneyplayzz", hash: "#vip", href: "http://localhost/" },
    writable: true,
    configurable: true,
  });
  return assign;
}

describe("SellerStatusBanner", () => {
  beforeEach(() => {
    client.startVipOnboarding.mockReset();
    client.getVipSellerAccount.mockReset();
    client.startVipSelling.mockReset();
    client.getVipSellerAccount.mockResolvedValue({ status: "onboarding", charges_enabled: false, stage: "needs_info" });
    setLocation("");
  });

  const base = { token: "tok", paymentsEnabled: true, onStatusChange: () => {} };

  it("banner per status: onboarding", async () => {
    const assign = setLocation("");
    client.startVipOnboarding.mockResolvedValue({ url: "https://stripe/x" });
    render(<SellerStatusBanner {...base} status="onboarding" />);
    expect(
      screen.getByText("Finishing setup with Stripe. Your Subscribe button turns on when Stripe is done."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue setup" }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("https://stripe/x"));
  });

  it("banner per status: onboarding hides Continue setup when payments are off", () => {
    render(<SellerStatusBanner {...base} paymentsEnabled={false} status="onboarding" />);
    expect(screen.queryByRole("button", { name: "Continue setup" })).toBeNull();
  });

  it("banner per status: restricted", () => {
    render(<SellerStatusBanner {...base} status="restricted" />);
    expect(
      screen.getByText(
        "Stripe needs more information before you can take payments. Billing for your subscribers is paused until it's sorted.",
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /^Open Stripe/ });
    expect(link).toHaveAttribute("href", "https://dashboard.stripe.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("banner per status: stopped starts selling again", async () => {
    client.startVipSelling.mockResolvedValue({ status: "active" });
    const onStatusChange = vi.fn();
    render(<SellerStatusBanner {...base} onStatusChange={onStatusChange} status="stopped" />);
    expect(
      screen.getByText(
        "You stopped selling. New subscriptions are closed; current subscribers keep access until their period ends.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start selling again" }));
    await vi.waitFor(() => expect(onStatusChange).toHaveBeenCalledWith("active"));
  });

  it("banner per status: disabled", () => {
    render(<SellerStatusBanner {...base} status="disabled" />);
    expect(
      screen.getByText("VIP selling is turned off for your account. Contact support@tailslips.com."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders nothing when active", () => {
    const { container } = render(<SellerStatusBanner {...base} status="active" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("?vip=onboarded refreshes the account once", async () => {
    setLocation("?vip=onboarded");
    client.getVipSellerAccount.mockResolvedValue({ status: "active", charges_enabled: true });
    const onStatusChange = vi.fn();
    render(<SellerStatusBanner {...base} onStatusChange={onStatusChange} status="onboarding" />);
    await vi.waitFor(() => expect(onStatusChange).toHaveBeenCalledWith("active"));
    expect(client.getVipSellerAccount).toHaveBeenCalledTimes(1);
  });

  it("?vip=resume restarts onboarding when payments are enabled", async () => {
    const assign = setLocation("?vip=resume");
    client.startVipOnboarding.mockResolvedValue({ url: "https://stripe/y" });
    render(<SellerStatusBanner {...base} status="onboarding" />);
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("https://stripe/y"));
  });

  it("strips the vip param (keeping other params and hash) before redirecting", async () => {
    setLocation("?vip=resume&x=1");
    const replace = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    client.startVipOnboarding.mockResolvedValue({ url: "https://stripe/z" });
    render(<SellerStatusBanner {...base} status="restricted" />);
    expect(replace).toHaveBeenCalledWith(null, "", "/cappers/moneyplayzz?x=1#vip");
    await vi.waitFor(() => expect(client.startVipOnboarding).toHaveBeenCalled());
    replace.mockRestore();
  });

  it("strips the vip param on onboarded", async () => {
    setLocation("?vip=onboarded");
    const replace = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    client.getVipSellerAccount.mockResolvedValue({ status: "active", charges_enabled: true });
    render(<SellerStatusBanner {...base} status="onboarding" />);
    expect(replace).toHaveBeenCalledWith(null, "", "/cappers/moneyplayzz#vip");
    await vi.waitFor(() => expect(client.getVipSellerAccount).toHaveBeenCalled());
    replace.mockRestore();
  });

  it("?vip=resume ignores a seller that is not onboarding or restricted", () => {
    setLocation("?vip=resume");
    render(<SellerStatusBanner {...base} status="stopped" />);
    expect(client.startVipOnboarding).not.toHaveBeenCalled();
  });

  it("?vip=resume does nothing when payments are off", () => {
    setLocation("?vip=resume");
    render(<SellerStatusBanner {...base} paymentsEnabled={false} status="onboarding" />);
    expect(client.startVipOnboarding).not.toHaveBeenCalled();
  });

  describe("live refresh", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const VERIFYING = "Stripe is verifying your details. Hang tight, this page updates on its own.";

    it("verifying shows the wait line and no button", async () => {
      client.getVipSellerAccount.mockResolvedValue({ status: "onboarding", charges_enabled: false, stage: "verifying" });
      render(<SellerStatusBanner {...base} status="onboarding" />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText(VERIFYING)).toBeInTheDocument();
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("polls while onboarding and reports the flip to active", async () => {
      client.getVipSellerAccount
        .mockResolvedValueOnce({ status: "onboarding", charges_enabled: false, stage: "verifying" })
        .mockResolvedValue({ status: "active", charges_enabled: true, stage: null });
      const onStatusChange = vi.fn();
      render(<SellerStatusBanner {...base} onStatusChange={onStatusChange} status="onboarding" />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(onStatusChange).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      expect(onStatusChange).toHaveBeenCalledWith("active");
    });

    it("re-checks when the tab comes back", async () => {
      render(<SellerStatusBanner {...base} status="restricted" />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      const calls = client.getVipSellerAccount.mock.calls.length;
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(client.getVipSellerAccount.mock.calls.length).toBe(calls + 1);
    });

    it("does not poll an active or stopped seller", async () => {
      render(<SellerStatusBanner {...base} status="active" />);
      render(<SellerStatusBanner {...base} status="stopped" />);
      await vi.advanceTimersByTimeAsync(30000);
      expect(client.getVipSellerAccount).not.toHaveBeenCalled();
    });

    it("stops polling on unmount", async () => {
      const { unmount } = render(<SellerStatusBanner {...base} status="onboarding" />);
      await vi.advanceTimersByTimeAsync(0);
      unmount();
      const calls = client.getVipSellerAccount.mock.calls.length;
      await vi.advanceTimersByTimeAsync(30000);
      expect(client.getVipSellerAccount.mock.calls.length).toBe(calls);
    });
  });
});
