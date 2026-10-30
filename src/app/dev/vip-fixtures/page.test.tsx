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
  getVipSellerSubscribers: vi.fn(() => Promise.resolve({ subscribers: [] })),
  getVipBoardSlate: vi.fn(() => Promise.resolve({ games: [] })),
  getVipBoardGame: vi.fn(),
  fixVipPick: vi.fn(),
  pullVipPick: vi.fn(),
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
    // Subscriber profile row (a) and the stable card VIP panel (d).
    expect(screen.getAllByText("3-leg parlay +595")).toHaveLength(2);
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.getByText(/Start selling unlocks once a sport is eligible/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post a VIP pick" })).toBeInTheDocument();
    expect(screen.getByText(/Billing is paused/)).toBeInTheDocument();
    // (c3) owner with a closed door: MLB stat reads as not selling.
    expect(screen.getByLabelText("Not currently selling: -3.2u MLB, last 30 days")).toBeInTheDocument();
    // (b) anonymous: a sport with no history row.
    expect(screen.getByLabelText("Not currently selling: +0.0u NFL, last 30 days")).toHaveTextContent(
      "0.0u",
    );
    expect(screen.getByText("Subscription ended")).toBeInTheDocument();
    // Anonymous: parlay legs collapse to one ticket, plus the straight.
    // Subscriber (a) and anonymous (b) both count 2 tickets.
    expect(screen.getByRole("heading", { name: "VIP · 2 picks" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "VIP · 2 locked" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Locked")).toHaveLength(2);
  });
});
