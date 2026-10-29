import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const NOT_FOUND = "NEXT_NOT_FOUND_SENTINEL";
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error(NOT_FOUND);
  }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({ fetchCapperProfile: vi.fn() }));
vi.mock("@/components/nav/TopNav", () => ({ TopNav: () => <nav data-testid="topnav" /> }));
vi.mock("@/components/vip/EligibilityBadges", () => ({
  EligibilityGroups: () => <div data-testid="badges" />,
}));

import { notFound } from "next/navigation";
import { fetchCapperProfile } from "@/lib/api";
import SubscribePage from "./page";

const profile = {
  capper: { id: 7, handle: "sharp", display_name: "Sharp Sam", profile_image_url: null },
};
const status = {
  seller: { capper_id: 7, price_cents: 2500, founding: false, status: "active" },
  eligibility: [],
  door_open: true,
  viewer: { subscribed: false, is_owner: false },
  vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 },
  locked: [],
};

describe("subscribe page", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "true");
    vi.mocked(fetchCapperProfile).mockResolvedValue(profile as never);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => status }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders the price, the Subscribe button and the proof", async () => {
    const el = await SubscribePage({ params: Promise.resolve({ handle: "sharp" }) });
    render(el);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Sharp Sam VIP");
    expect(screen.getAllByRole("button", { name: "Subscribe · $25/mo" })).toHaveLength(2);
    expect(screen.getByText("Verified by TailSlips")).toBeTruthy();
    expect(screen.getByText(/Secure checkout with Stripe/)).toBeTruthy();
    expect(screen.getByTestId("badges")).toBeTruthy();
    expect(screen.getByText("← Profile").closest("a")?.getAttribute("href")).toBe(
      "/cappers/sharp",
    );
  });

  it("hides Subscribe and says why when new subscriptions are closed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...status, door_open: false, door_closed_reason: "silent" }),
      }),
    );
    const el = await SubscribePage({ params: Promise.resolve({ handle: "sharp" }) });
    render(el);
    expect(screen.queryByRole("button", { name: /Subscribe/ })).toBeNull();
    expect(screen.queryByText(/Secure checkout/)).toBeNull();
    expect(
      screen.getAllByText("No VIP picks in 14 days. Subscriptions reopen with the next pick."),
    ).toHaveLength(2);
  });

  it("still renders when the status fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const el = await SubscribePage({ params: Promise.resolve({ handle: "sharp" }) });
    render(el);
    expect(screen.queryByText(/\/mo/)).toBeNull();
    expect(screen.queryByTestId("badges")).toBeNull();
    expect(screen.getByText("@sharp is not selling VIP picks right now.")).toBeTruthy();
  });

  it("404 when flag off", async () => {
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "false");
    await expect(
      SubscribePage({ params: Promise.resolve({ handle: "sharp" }) }),
    ).rejects.toThrow(NOT_FOUND);
    expect(notFound).toHaveBeenCalled();
  });
});
