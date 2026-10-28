import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubscribeDoor } from "./SubscribeDoor";
import type { VipCapperStatus } from "@/lib/vip/types";

function status(over: Partial<VipCapperStatus>): VipCapperStatus {
  return {
    seller: { capper_id: 7, price_cents: 2500, founding: false, status: "active" },
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

// Tooltip reads (hover: none) on mount; jsdom has no matchMedia.
beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

describe("SubscribeDoor", () => {
  it("door shows price button when open", () => {
    render(<SubscribeDoor status={status({})} handle="moneyplayzz" />);
    const link = screen.getByRole("link", { name: "Subscribe $25/mo" });
    expect(link).toHaveAttribute("href", "/cappers/moneyplayzz/subscribe");
  });

  it("door shows cents when the price is not whole", () => {
    render(
      <SubscribeDoor
        status={status({
          seller: { capper_id: 7, price_cents: 1999, founding: false, status: "active" },
        })}
        handle="moneyplayzz"
      />,
    );
    expect(screen.getByRole("link", { name: "Subscribe $19.99/mo" })).toBeInTheDocument();
  });

  it("door hides button when closed", () => {
    render(<SubscribeDoor status={status({ door_open: false })} handle="moneyplayzz" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Not currently selling: -4.0u MLB, last 30 days")).toBeInTheDocument();
  });

  it("door renders nothing without seller", () => {
    const { container } = render(
      <SubscribeDoor status={status({ seller: null, door_open: false })} handle="moneyplayzz" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
