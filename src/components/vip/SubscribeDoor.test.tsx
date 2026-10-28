import { describe, expect, it } from "vitest";
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

  it("door slot is empty when closed with no ineligible sports", () => {
    const { container } = render(
      <SubscribeDoor
        status={status({
          door_open: false,
          eligibility: [
            {
              sport: "MLB",
              eligible: true,
              eligible_since: "2026-10-01",
              units: 5,
              n_picks: 20,
              n_floor_picks: 20,
              run_date: "2026-10-27",
            },
          ],
        })}
        handle="moneyplayzz"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("door renders nothing without seller", () => {
    const { container } = render(
      <SubscribeDoor status={status({ seller: null, door_open: false })} handle="moneyplayzz" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("door renders nothing for the owner", () => {
    const { container } = render(
      <SubscribeDoor status={status({ viewer: { subscribed: false, is_owner: true } })} handle="moneyplayzz" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("door shows a Subscribed pill instead of the button for a subscriber", () => {
    render(
      <SubscribeDoor status={status({ viewer: { subscribed: true, is_owner: false } })} handle="moneyplayzz" />,
    );
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("owner with closed door sees the closed pills and no link", () => {
    render(
      <SubscribeDoor
        status={status({ door_open: false, viewer: { subscribed: false, is_owner: true } })}
        handle="moneyplayzz"
      />,
    );
    expect(screen.getByText("Not currently selling: -4.0u MLB, last 30 days")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("Subscribed")).toBeNull();
  });

  it("subscriber with closed door sees Subscribed and the closed pills", () => {
    render(
      <SubscribeDoor
        status={status({ door_open: false, viewer: { subscribed: true, is_owner: false } })}
        handle="moneyplayzz"
      />,
    );
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.getByText("Not currently selling: -4.0u MLB, last 30 days")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
