import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

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
    value: { search, assign, href: "http://localhost/" },
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
        "Stripe needs more information before you can take payments. Your subscribers are paused until it's sorted.",
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Open Stripe" });
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

  it("?vip=resume does nothing when payments are off", () => {
    setLocation("?vip=resume");
    render(<SellerStatusBanner {...base} paymentsEnabled={false} status="onboarding" />);
    expect(client.startVipOnboarding).not.toHaveBeenCalled();
  });
});
