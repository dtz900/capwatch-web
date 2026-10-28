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
vi.mock("@/components/auth/TailButton", () => ({
  TailButton: ({ capperId }: { capperId: number }) => <button>Tail {capperId}</button>,
}));
vi.mock("@/components/vip/EligibilityBadges", () => ({
  EligibilityBadges: () => <div data-testid="badges" />,
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

  it("renders price and open-soon copy", async () => {
    const el = await SubscribePage({ params: Promise.resolve({ handle: "sharp" }) });
    render(el);
    expect(screen.getByText("$25/mo")).toBeTruthy();
    expect(
      screen.getByText("Subscriptions open soon. Follow @sharp to get notified."),
    ).toBeTruthy();
    expect(screen.getByText("Sharp Sam")).toBeTruthy();
    expect(screen.getByTestId("badges")).toBeTruthy();
    expect(screen.getByText("Back to profile").closest("a")?.getAttribute("href")).toBe(
      "/cappers/sharp",
    );
  });

  it("still renders when the status fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const el = await SubscribePage({ params: Promise.resolve({ handle: "sharp" }) });
    render(el);
    expect(screen.queryByText(/\/mo/)).toBeNull();
    expect(screen.queryByTestId("badges")).toBeNull();
  });

  it("404 when flag off", async () => {
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "false");
    await expect(
      SubscribePage({ params: Promise.resolve({ handle: "sharp" }) }),
    ).rejects.toThrow(NOT_FOUND);
    expect(notFound).toHaveBeenCalled();
  });
});
