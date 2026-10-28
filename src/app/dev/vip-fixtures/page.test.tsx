import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ authReady: true, session: null, capper: null }),
}));
vi.mock("@/lib/vip/client", () => ({
  VipApiError: class extends Error {},
  postVipSeller: vi.fn(),
  patchVipSeller: vi.fn(),
  postVipPick: vi.fn(),
  searchVipGames: vi.fn(),
  getVipMe: vi.fn(),
  getVipCapperStatus: vi.fn(),
  getVipSubscriptions: vi.fn(),
}));

import VipFixturesPage from "./page";

afterEach(() => vi.unstubAllEnvs());

describe("vip fixtures page", () => {
  it("404 when fixtures flag off", () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_FIXTURES", "false");
    expect(() => render(<VipFixturesPage />)).toThrow("NEXT_NOT_FOUND");
  });

  it("renders every scenario when the flag is on", () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_FIXTURES", "true");
    render(<VipFixturesPage />);
    expect(screen.getAllByText("3-leg parlay +595 · 1u")).toHaveLength(2);
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.getByText(/Start selling unlocks once a sport is eligible/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post VIP pick" })).toBeInTheDocument();
    expect(screen.getByText("Paused: cold")).toBeInTheDocument();
    // (c3) owner with a closed door sees the reason.
    expect(screen.getByText("Not currently selling: -3.2u MLB, last 30 days")).toBeInTheDocument();
    expect(screen.getByText("Canceled")).toBeInTheDocument();
    // Anonymous: parlay legs collapse to one ticket, plus the straight.
    // Subscriber (a) and anonymous (b) both count 2 tickets; the tab card counts 1.
    expect(screen.getAllByText("VIP · 2 locked")).toHaveLength(2);
    expect(screen.getAllByLabelText("Locked")).toHaveLength(2);
  });
});
