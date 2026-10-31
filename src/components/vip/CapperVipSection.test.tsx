import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    getVipSellerSubscribers: vi.fn(),
    getVipBoardSlate: vi.fn(),
    getVipBoardGame: vi.fn(),
    postVipSeller: vi.fn(),
    postVipPick: vi.fn(),
    openVipPortal: vi.fn(),
    searchVipGames: vi.fn(),
    VipApiError,
  };
});
vi.mock("@/lib/vip/client", () => client);

import { CapperVipSection } from "./CapperVipSection";
import { VipInitialStatusProvider } from "./VipInitialStatus";

const status: VipCapperStatus = {
  seller: { price_cents: 2500, founding: false, status: "active" },
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
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } } };
    client.getVipCapperStatus.mockReset();
    client.getVipMe.mockReset();
    client.patchVipSeller.mockReset();
    client.getVipSellerSubscribers.mockResolvedValue({ subscribers: [
      { username: "sharpshooter_22", since: "2026-10-04T12:00:00Z", renews: true, current_period_end: "2026-11-04T12:00:00Z" },
      { username: null, since: "2026-09-30T12:00:00Z", renews: false, current_period_end: "2026-11-01T12:00:00Z" },
    ] });
    client.getVipBoardSlate.mockResolvedValue({ games: [] });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("section shows VIP record line when n > 0", async () => {
    client.getVipCapperStatus.mockResolvedValue(status);
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(await screen.findByLabelText("VIP picks: 6-3-1, +2.4u")).toHaveTextContent("6-3-1");
    expect(screen.getByText("VIP record")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Capper VIP" })).toBeInTheDocument();
    expect(client.getVipCapperStatus).toHaveBeenCalledWith(7, "tok");
    expect(screen.getByRole("heading", { name: "VIP Eligible" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "What is this?" })).toHaveAttribute("href", "/vip-rules");
  });

  it("section hides VIP record line when n is 0", async () => {
    client.getVipCapperStatus.mockResolvedValue({
      ...status,
      vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 },
    });
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByRole("region", { name: "Capper VIP" });
    expect(screen.queryByLabelText(/VIP picks:/)).toBeNull();
    expect(screen.getByText("No VIP picks graded yet")).toBeInTheDocument();
  });

  it("section record line drops pushes when there are none", async () => {
    client.getVipCapperStatus.mockResolvedValue({
      ...status,
      vip_record: { n: 9, wins: 6, losses: 3, pushes: 0, units: -1.05 },
    });
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(await screen.findByLabelText("VIP picks: 6-3, -1.1u")).toHaveTextContent("6-3-1.1u");
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

  it("user change refetches and clears the previous payload", async () => {
    client.getVipCapperStatus.mockResolvedValueOnce(status);
    const { rerender } = render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByRole("region", { name: "Capper VIP" });
    let resolveAnon: (s: VipCapperStatus) => void = () => {};
    client.getVipCapperStatus.mockReturnValueOnce(
      new Promise<VipCapperStatus>((r) => {
        resolveAnon = r;
      }),
    );
    auth.value = { authReady: true, session: null };
    rerender(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(screen.queryByRole("region", { name: "Capper VIP" })).toBeNull();
    resolveAnon(status);
    expect(await screen.findByRole("region", { name: "Capper VIP" })).toBeInTheDocument();
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
    auth.value = { authReady: true, session: null };
    client.getVipCapperStatus.mockResolvedValue(status);
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByRole("region", { name: "Capper VIP" });
    expect(client.getVipCapperStatus).toHaveBeenCalledWith(7, null);
  });

  it("section shows the owner panel only to the claimed capper", async () => {
    client.getVipCapperStatus.mockResolvedValue(status);
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByRole("region", { name: "Capper VIP" });
    expect(screen.queryByRole("region", { name: "Your VIP dashboard" })).toBeNull();
    expect(client.getVipMe).not.toHaveBeenCalled();
  });

  it("seller stats card shows price, book, subscribers and saves a new price", async () => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } }, capper: { id: 7, handle: "moneyplayzz" } };
    client.getVipCapperStatus.mockResolvedValue(status);
    client.getVipMe.mockResolvedValue({
      capper: { id: 7, handle: "moneyplayzz" },
      seller: { ...status.seller, preferred_book: "draftkings" },
      eligibility: [],
      can_post_sports: ["MLB"],
    });
    client.patchVipSeller.mockResolvedValue({ ...status.seller, price_cents: 3000 });
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(await screen.findByRole("region", { name: "Your VIP dashboard" })).toBeInTheDocument();
    expect(screen.getByText("DraftKings")).toBeInTheDocument();
    // One renewing, one canceled but still in its period.
    expect(await screen.findByText("1 canceling")).toBeInTheDocument();
    expect(screen.getByText("$21.25")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Subscribers/ }));
    expect(screen.getByText("@sharpshooter_22")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit price" }));
    fireEvent.change(screen.getByLabelText("Monthly price (USD)"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(client.patchVipSeller).toHaveBeenCalledWith({ price_cents: 3000 }, "tok"),
    );
    await waitFor(() => expect(client.getVipMe).toHaveBeenCalledTimes(2));
    expect(client.getVipCapperStatus).toHaveBeenCalledTimes(2);
  });

  it("section owner with nothing public and nothing eligible sees the requirement line", async () => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } }, capper: { id: 7, handle: "moneyplayzz" } };
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
    expect(await screen.findByText(/Start selling unlocks once a sport is eligible/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start selling" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Capper VIP" })).toBeNull();
  });

  it.each([
    ["active", true],
    ["stopped", false],
    ["disabled", false],
  ])("owner panel eligibility hint for a %s seller with nothing eligible", async (sellerStatus, shown) => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } }, capper: { id: 7, handle: "moneyplayzz" } };
    client.getVipCapperStatus.mockResolvedValue(status);
    client.getVipMe.mockResolvedValue({
      capper: { id: 7, handle: "moneyplayzz" },
      seller: { ...status.seller, status: sellerStatus, preferred_book: "draftkings" },
      eligibility: [],
      can_post_sports: [],
    });
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByRole("region", { name: "Your VIP dashboard" });
    const hint = screen.queryByText("You can post VIP picks once a sport is eligible.");
    expect(hint !== null).toBe(shown);
  });

  it("section shows the owner panel when the platform says this viewer owns the capper", async () => {
    // Owner linked in the database without X verification: no claimed capper
    // on the session, but the status says is_owner.
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } }, capper: null };
    client.getVipCapperStatus.mockResolvedValue({ ...status, viewer: { subscribed: false, is_owner: true } });
    client.getVipMe.mockResolvedValue({
      capper: { id: 7, handle: "moneyplayzz" },
      seller: status.seller,
      eligibility: [],
      can_post_sports: ["MLB"],
    });
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    expect(await screen.findByRole("region", { name: "Your VIP dashboard" })).toBeInTheDocument();
  });

  it("section hides the owner panel from a different signed-in capper", async () => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } }, capper: { id: 99, handle: "someoneelse" } };
    client.getVipCapperStatus.mockResolvedValue(status);
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByRole("region", { name: "Capper VIP" });
    expect(screen.queryByRole("region", { name: "Your VIP dashboard" })).toBeNull();
    expect(client.getVipMe).not.toHaveBeenCalled();
  });

  it("waits for authReady before fetching", async () => {
    auth.value = { authReady: false, session: null };
    client.getVipCapperStatus.mockResolvedValue(status);
    render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await Promise.resolve();
    expect(client.getVipCapperStatus).not.toHaveBeenCalled();
  });

  it("token refresh does not refetch or remount", async () => {
    const owner = (token: string) => ({
      authReady: true,
      session: { access_token: token, user: { id: "u1" } },
      capper: { id: 7, handle: "moneyplayzz" },
    });
    auth.value = owner("tok");
    client.getVipCapperStatus.mockResolvedValue(status);
    client.getVipMe.mockResolvedValue({
      capper: { id: 7, handle: "moneyplayzz" },
      seller: status.seller,
      eligibility: [{ sport: "MLB", eligible: true, eligible_since: "2026-10-01", fail_streak: 0 }],
      can_post_sports: ["MLB"],
    });
    const { rerender } = render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await screen.findByRole("region", { name: "Your VIP dashboard" });
    fireEvent.click(await screen.findByRole("button", { name: "Post a VIP pick" }));
    const draft = screen.getByPlaceholderText('selection text, e.g. "Yankees ML"');
    fireEvent.change(draft, { target: { value: "Draft text" } });

    auth.value = owner("tok-refreshed");
    rerender(<CapperVipSection capperId={7} handle="moneyplayzz" />);
    await Promise.resolve();

    expect(client.getVipCapperStatus).toHaveBeenCalledTimes(1);
    expect(client.getVipMe).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("region", { name: "Your VIP dashboard" })).toBeInTheDocument();
    // The selling owner's dashboard replaces the public card.
    expect(screen.queryByRole("region", { name: "Capper VIP" })).toBeNull();
    expect(screen.getByDisplayValue("Draft text")).toBe(draft);
  });

  it("owner panel hidden for denylisted handle", async () => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } }, capper: { id: 7, handle: "FadeAI_" } };
    client.getVipCapperStatus.mockResolvedValue(status);
    client.getVipMe.mockResolvedValue({
      capper: { id: 7, handle: "FadeAI_" },
      // A seller row on a house account must not blank the section.
      seller: status.seller,
      eligibility: [{ sport: "MLB", eligible: true, eligible_since: "2026-10-01", fail_streak: 0 }],
      can_post_sports: ["MLB"],
    });
    render(<CapperVipSection capperId={7} handle="FadeAI_" />);
    await screen.findByRole("region", { name: "Capper VIP" });
    await waitFor(() => expect(client.getVipMe).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByRole("region", { name: "Your VIP dashboard" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start selling" })).toBeNull();
    expect(screen.getByRole("region", { name: "Capper VIP" })).toBeInTheDocument();
  });

  describe("live access re-check", () => {
    const paid = { ...status, viewer: { subscribed: true, is_owner: false, billing: "stripe" as const } };
    let hidden = false;
    beforeEach(() => {
      vi.useFakeTimers();
      hidden = false;
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => (hidden ? "hidden" : "visible"),
      });
    });
    afterEach(() => {
      vi.useRealTimers();
      // Back to jsdom's own getter on the prototype.
      delete (document as { visibilityState?: string }).visibilityState;
    });
    const settle = () =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

    it("a subscriber who loses access loses the picks without a refresh", async () => {
      client.getVipCapperStatus.mockResolvedValueOnce(paid).mockResolvedValue(status);
      render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
      await settle();
      expect(screen.getByText("Subscribed")).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(screen.queryByText("Subscribed")).toBeNull();
    });

    it("re-checks when the tab comes back, not while hidden", async () => {
      client.getVipCapperStatus.mockResolvedValue(paid);
      render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
      await settle();
      hidden = true;
      await vi.advanceTimersByTimeAsync(60000);
      expect(client.getVipCapperStatus).toHaveBeenCalledTimes(1);
      hidden = false;
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(client.getVipCapperStatus).toHaveBeenCalledTimes(2);
    });

    it("a failed re-check keeps the section on screen", async () => {
      client.getVipCapperStatus.mockResolvedValueOnce(paid).mockRejectedValue(new Error("blip"));
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
      await settle();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(screen.getByText("Subscribed")).toBeInTheDocument();
      err.mockRestore();
    });

    it("does not re-check a profile with no VIP to show", async () => {
      client.getVipCapperStatus.mockResolvedValue({
        ...status, seller: null, eligibility: [], locked: [],
      });
      render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
      await settle();
      await vi.advanceTimersByTimeAsync(90000);
      expect(client.getVipCapperStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe("return from checkout", () => {
    const paid = { ...status, viewer: { subscribed: true, is_owner: false, billing: "stripe" as const } };
    beforeEach(() => {
      vi.useFakeTimers();
      window.history.replaceState(null, "", "/cappers/moneyplayzz?vip=subscribed");
    });
    afterEach(() => {
      vi.useRealTimers();
      window.history.replaceState(null, "", "/");
    });

    it("success return polls until access", async () => {
      client.getVipCapperStatus
        .mockResolvedValueOnce(status)
        .mockResolvedValueOnce(status)
        .mockResolvedValue(paid);
      render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
      expect(window.location.search).toBe("");
      await vi.advanceTimersByTimeAsync(0);
      expect(screen.getByText("You're in. VIP picks show here and arrive by email.")).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(screen.getByText("Subscribed")).toBeInTheDocument();
      const calls = client.getVipCapperStatus.mock.calls.length;
      await vi.advanceTimersByTimeAsync(9000);
      expect(client.getVipCapperStatus.mock.calls.length).toBe(calls);
    });

    it("a failed poll keeps the last good status on screen", async () => {
      client.getVipCapperStatus
        .mockResolvedValueOnce(status)
        .mockRejectedValueOnce(new Error("blip"));
      render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByRole("region", { name: "Capper VIP" })).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(client.getVipCapperStatus.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole("region", { name: "Capper VIP" })).toBeInTheDocument();
    });

    it("manage subscription uses the profile capper id", async () => {
      client.getVipCapperStatus.mockResolvedValue(paid);
      client.openVipPortal.mockResolvedValue({ url: "https://billing.stripe.com/p" });
      render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      fireEvent.click(screen.getByRole("button", { name: "Manage subscription" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(client.openVipPortal).toHaveBeenCalledWith(7, expect.anything());
    });

    it("stops polling after 30 seconds", async () => {
      client.getVipCapperStatus.mockResolvedValue(status);
      render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
      await vi.advanceTimersByTimeAsync(31000);
      const calls = client.getVipCapperStatus.mock.calls.length;
      expect(calls).toBeLessThanOrEqual(12);
      await vi.advanceTimersByTimeAsync(9000);
      // The 3s checkout poll would add 3; only the 30s access re-check may land.
      expect(client.getVipCapperStatus.mock.calls.length - calls).toBeLessThanOrEqual(1);
    });

    it("stops polling on unmount", async () => {
      client.getVipCapperStatus.mockResolvedValue(status);
      const { unmount } = render(<CapperVipSection capperId={7} handle="moneyplayzz" />);
      await vi.advanceTimersByTimeAsync(3000);
      unmount();
      const calls = client.getVipCapperStatus.mock.calls.length;
      await vi.advanceTimersByTimeAsync(9000);
      expect(client.getVipCapperStatus.mock.calls.length).toBe(calls);
    });
  });
  describe("first paint from the server's anonymous status", () => {
    it("paints the card before the viewer's status lands, with Subscribe held back", () => {
      client.getVipCapperStatus.mockReturnValue(new Promise(() => {}));
      render(
        <VipInitialStatusProvider status={status}>
          <CapperVipSection capperId={7} handle="moneyplayzz" />
        </VipInitialStatusProvider>,
      );
      expect(screen.getByRole("heading", { name: "VIP Eligible" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Subscribe" })).not.toBeInTheDocument();
    });

    it("a subscriber goes straight to Subscribed, never Subscribe", async () => {
      client.getVipCapperStatus.mockResolvedValue({
        ...status,
        viewer: { subscribed: true, is_owner: false, billing: "stripe" },
      });
      render(
        <VipInitialStatusProvider status={status}>
          <CapperVipSection capperId={7} handle="moneyplayzz" />
        </VipInitialStatusProvider>,
      );
      expect(screen.queryByRole("link", { name: "Subscribe" })).not.toBeInTheDocument();
      expect(await screen.findByText("Subscribed")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Subscribe" })).not.toBeInTheDocument();
    });
  });
});
