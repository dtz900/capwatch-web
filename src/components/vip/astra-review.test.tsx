// PR #233 full-review regressions (GPT Astra, 2026-10-31). Assertions describe the
// required behavior; see projects/tailslips/vip-code-review-2026-10-31.md in the EA repo.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { VipCapperStatus } from "@/lib/vip/types";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const client = vi.hoisted(() => {
  class VipApiError extends Error { status = 500; detail = "unavailable"; }
  return {
    getVipCapperStatus: vi.fn(),
    pullVipPick: vi.fn(),
    startVipCheckout: vi.fn(),
    openVipPortal: vi.fn(),
    VipApiError,
  };
});
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
vi.mock("@/lib/vip/client", () => client);
vi.mock("@/components/vip/OwnerPanel", () => ({ OwnerPanel: () => null }));
vi.mock("@/components/vip/LockedPicks", () => ({ LockedPicks: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { CapperVipSection } from "@/components/vip/CapperVipSection";
import { VipInitialStatusProvider } from "@/components/vip/VipInitialStatus";
import { SubscribeDoor } from "@/components/vip/SubscribeDoor";

const anonymous: VipCapperStatus = {
  seller: { price_cents: 2500, founding: false, status: "active" },
  eligibility: [],
  door_open: true,
  viewer: { subscribed: false, is_owner: false, billing: null },
  vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 },
  locked: [],
};
const paid: VipCapperStatus = {
  ...anonymous,
  viewer: { subscribed: true, is_owner: false, billing: "stripe" },
};
const sellerPaused: VipCapperStatus = {
  ...anonymous,
  seller: { ...anonymous.seller!, status: "restricted" },
  door_open: false,
  viewer: { subscribed: false, is_owner: false, billing: "stripe" },
};

async function profile() {
  await act(async () => {
    render(
      <VipInitialStatusProvider status={anonymous}>
        <CapperVipSection capperId={7} handle="moneyplayzz" />
      </VipInitialStatusProvider>,
    );
  });
}

describe("PR 233 independent review", () => {
  beforeEach(() => {
    auth.value = {
      authReady: true,
      session: { access_token: "tok", user: { id: "u1" }, expires_at: Date.now() / 1000 + 3600 },
    };
    client.getVipCapperStatus.mockReset();
    window.history.replaceState(null, "", "/cappers/moneyplayzz");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("control: a verified subscriber sees Manage subscription", async () => {
    client.getVipCapperStatus.mockResolvedValue(paid);
    await profile();
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Subscribe" })).toBeNull();
  });

  it("control: a paused Stripe subscriber normally retains Manage subscription", async () => {
    client.getVipCapperStatus.mockResolvedValue(sellerPaused);
    await profile();
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
  });

  it("F1: an unverified signed-in viewer must not be offered a new subscription after lookup failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    client.getVipCapperStatus.mockRejectedValue(new Error("status endpoint unavailable"));
    await profile();
    expect(screen.getByRole("region", { name: "Capper VIP" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Subscribe" })).toBeNull();
  });

  it("F2: a completed checkout must not hide Manage when access subsequently pauses", async () => {
    window.history.replaceState(null, "", "/cappers/moneyplayzz?vip=subscribed");
    client.getVipCapperStatus.mockResolvedValue(paid);
    await profile();
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
    client.getVipCapperStatus.mockResolvedValue(sellerPaused);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(client.getVipCapperStatus).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "Manage subscription" })).not.toBeNull();
  });

  it("F2b: a checkout return whose first status is a paused Stripe subscription still reaches Manage", async () => {
    // Codex on the F2 fix: the subscription exists at Stripe (billing "stripe") but
    // access was never seen; the hold must release so the viewer can manage it.
    window.history.replaceState(null, "", "/cappers/moneyplayzz?vip=subscribed");
    client.getVipCapperStatus.mockResolvedValue(sellerPaused);
    await profile();
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Subscribe" })).toBeNull();
  });
  it("F3: a seller restriction alone must not be diagnosed as a failed customer card", () => {
    render(<SubscribeDoor status={sellerPaused} handle="moneyplayzz" capperId={7} />);
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
    expect(screen.queryByText("Payment issue, update your card")).toBeNull();
  });
});
