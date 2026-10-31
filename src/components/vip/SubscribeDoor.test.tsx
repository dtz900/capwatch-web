import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { VipCapperStatus } from "@/lib/vip/types";
import { subscriberDisclosure, SUBSCRIBER_TERMS_VERSION } from "@/lib/vip/terms";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
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
  return { startVipCheckout: vi.fn(), openVipPortal: vi.fn(), getVipCapperStatus: vi.fn(), VipApiError };
});
vi.mock("@/lib/vip/client", () => client);

import { SubscribeCheckout, SubscribeDoor } from "./SubscribeDoor";

function status(over: Partial<VipCapperStatus>): VipCapperStatus {
  return {
    seller: { price_cents: 2500, founding: false, status: "active" },
    eligibility: [
      {
        sport: "MLB",
        eligible: false,
        eligible_since: null,
        units: -4,
        n_picks: 20,
        n_floor_picks: 20,
        run_date: "2026-10-27",
      },
    ],
    door_open: true,
    viewer: { subscribed: false, is_owner: false },
    vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 },
    locked: [],
    ...over,
  };
}

describe("SubscribeDoor", () => {
  it("door open: big price and a Subscribe button", () => {
    render(<SubscribeDoor status={status({})} handle="moneyplayzz" capperId={42} />);
    const link = screen.getByRole("link", { name: "Subscribe" });
    expect(link).toHaveAttribute("href", "/cappers/moneyplayzz/subscribe");
    expect(link).toHaveClass("text-[var(--color-vip-deep)]");
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("/mo")).toBeInTheDocument();
  });

  it("door shows cents when the price is not whole", () => {
    render(
      <SubscribeDoor
        status={status({
          seller: { price_cents: 1999, founding: false, status: "active" },
        })}
        handle="moneyplayzz"
        capperId={42}
      />,
    );
    expect(screen.getByText("$19.99")).toBeInTheDocument();
  });

  it("door closed renders nothing (the body explains)", () => {
    const { container } = render(<SubscribeDoor status={status({ door_open: false })} handle="moneyplayzz" capperId={42} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("no seller renders nothing", () => {
    const { container } = render(
      <SubscribeDoor status={status({ seller: null, door_open: false })} handle="moneyplayzz" capperId={42} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("door renders nothing for the owner", () => {
    const { container } = render(
      <SubscribeDoor status={status({ viewer: { subscribed: false, is_owner: true } })} handle="moneyplayzz" capperId={42} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("subscriber sees a Subscribed chip and no link", () => {
    render(
      <SubscribeDoor status={status({ viewer: { subscribed: true, is_owner: false } })} handle="moneyplayzz" capperId={42} />,
    );
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("subscriber with closed door still sees Subscribed", () => {
    render(
      <SubscribeDoor
        status={status({ door_open: false, viewer: { subscribed: true, is_owner: false } })}
        handle="moneyplayzz"
        capperId={42}
      />,
    );
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("SubscribeCheckout", () => {
  const assign = vi.fn();
  beforeEach(() => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } } };
    router.push.mockReset();
    client.startVipCheckout.mockReset();
    client.openVipPortal.mockReset();
    client.getVipCapperStatus.mockReset();
    client.getVipCapperStatus.mockResolvedValue({ viewer: { subscribed: false, is_owner: false } });
    assign.mockReset();
    vi.stubGlobal("location", { ...window.location, assign, pathname: "/cappers/sharp/subscribe" });
  });
  // Signed in, Subscribe waits for the viewer's own status: settle it first.
  const open = async (over: Partial<VipCapperStatus> = {}) => {
    render(<SubscribeCheckout status={status({ payments_enabled: true, ...over })} handle="sharp" capperId={42} />);
    if (auth.value.session) await screen.findByRole("button", { name: /Subscribe ·/ });
  };
  const consentAndSubscribe = () => {
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Subscribe/ }));
  };

  it("signed out goes to sign in with next", async () => {
    auth.value = { authReady: true, session: null };
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Subscribe/ }));
    expect(router.push).toHaveBeenCalledWith("/login?next=%2Fcappers%2Fsharp%2Fsubscribe");
    expect(client.startVipCheckout).not.toHaveBeenCalled();
  });

  it("subscribe disabled until consent", async () => {
    client.startVipCheckout.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
    await open();
    const btn = screen.getByRole("button", { name: /Subscribe/ });
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/x"));
    expect(client.startVipCheckout).toHaveBeenCalledWith(42, SUBSCRIBER_TERMS_VERSION, "tok");
  });

  it("disclosure shows price and no refunds", async () => {
    await open();
    expect(screen.getByText(subscriberDisclosure(2500))).toBeInTheDocument();
    expect(screen.getByText(/No refunds\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Terms/ })).toHaveAttribute("href", "/terms");
  });

  it("already subscribed shows manage link", async () => {
    client.startVipCheckout.mockRejectedValue(new client.VipApiError(409, "already_subscribed"));
    await open();
    consentAndSubscribe();
    expect(await screen.findByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
  });

  it("not_selling shows the door-closed copy", async () => {
    client.startVipCheckout.mockRejectedValue(new client.VipApiError(409, "not_selling"));
    await open();
    consentAndSubscribe();
    expect(await screen.findByText("Not taking subscribers right now.")).toBeInTheDocument();
  });

  it("own_capper uses plain copy", async () => {
    client.startVipCheckout.mockRejectedValue(new client.VipApiError(409, "own_capper"));
    await open();
    consentAndSubscribe();
    expect(await screen.findByText("This is your own VIP.")).toBeInTheDocument();
  });

  it("unexpected error says try again", async () => {
    client.startVipCheckout.mockRejectedValue(new Error("boom"));
    await open();
    consentAndSubscribe();
    expect(await screen.findByText("Something went wrong. Try again.")).toBeInTheDocument();
  });

  it("signed out with payments off: Subscribe disabled and Checkout opens soon", async () => {
    auth.value = { authReady: true, session: null };
    await open({ payments_enabled: false });
    expect(screen.getByRole("button", { name: /Subscribe/ })).toBeDisabled();
    expect(screen.getByText("Checkout opens soon.")).toBeInTheDocument();
  });

  it("pending resets on bfcache pageshow", async () => {
    client.startVipCheckout.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
    await open();
    consentAndSubscribe();
    const btn = screen.getByRole("button", { name: /Subscribe/ });
    await waitFor(() => expect(assign).toHaveBeenCalled());
    expect(btn).toBeDisabled();
    const ev = new Event("pageshow") as Event & { persisted: boolean };
    ev.persisted = true;
    act(() => {
      window.dispatchEvent(ev);
    });
    expect(btn).toBeEnabled();
  });

  it("payments off keeps Subscribe disabled with no checkout call", async () => {
    await open({ payments_enabled: false });
    fireEvent.click(screen.getByRole("checkbox"));
    const btn = screen.getByRole("button", { name: /Subscribe/ });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(client.startVipCheckout).not.toHaveBeenCalled();
  });
  it("holds Subscribe while the viewer's status is in flight", () => {
    client.getVipCapperStatus.mockReturnValue(new Promise(() => {}));
    render(<SubscribeCheckout status={status({ payments_enabled: true })} handle="sharp" capperId={42} />);
    expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
  });

  it("a paying subscriber is told they already subscribe, never offered checkout", async () => {
    client.getVipCapperStatus.mockResolvedValue({
      viewer: { subscribed: true, is_owner: false, billing: "stripe" },
    });
    render(<SubscribeCheckout status={status({ payments_enabled: true })} handle="sharp" capperId={42} />);
    expect(await screen.findByText("You are already subscribed.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Subscribe ·/ })).not.toBeInTheDocument();
    expect(client.getVipCapperStatus).toHaveBeenCalledWith(42, "tok");
  });
});

describe("SubscribeDoor manage link", () => {
  it("stripe subscriber sees Manage subscription even with payments off", () => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } } };
    render(
      <SubscribeDoor
        status={status({
          payments_enabled: false,
          viewer: { subscribed: true, is_owner: false, billing: "stripe" },
        })}
        handle="sharp"
        capperId={42}
      />,
    );
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
  });

  it("portal URL uses the capper id prop, not the seller payload", async () => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } } };
    client.openVipPortal.mockResolvedValue({ url: "https://billing.stripe.com/p" });
    render(
      <SubscribeDoor
        status={status({ viewer: { subscribed: true, is_owner: false, billing: "stripe" } })}
        handle="sharp"
        capperId={42}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Manage subscription" }));
    await waitFor(() => expect(client.openVipPortal).toHaveBeenCalledWith(42, "tok"));
  });

  it("live stripe subscription without access (failed card) shows Manage, never Subscribe", () => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } } };
    render(
      <SubscribeDoor
        status={status({ viewer: { subscribed: false, is_owner: false, billing: "stripe" } })}
        handle="sharp"
        capperId={42}
      />,
    );
    expect(screen.getByText("Payment issue, update your card")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Subscribe" })).toBeNull();
  });

  it("admin-granted subscriber has no manage link", () => {
    render(
      <SubscribeDoor
        status={status({ viewer: { subscribed: true, is_owner: false, billing: "admin" } })}
        handle="sharp"
        capperId={42}
      />,
    );
    expect(screen.queryByRole("button", { name: "Manage subscription" })).toBeNull();
  });
});
