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
  it("door open: big price and a Subscribe button", () => {
    render(<SubscribeDoor status={status({})} handle="moneyplayzz" />);
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
          seller: { capper_id: 7, price_cents: 1999, founding: false, status: "active" },
        })}
        handle="moneyplayzz"
      />,
    );
    expect(screen.getByText("$19.99")).toBeInTheDocument();
  });

  it("door closed renders nothing (the body explains)", () => {
    const { container } = render(<SubscribeDoor status={status({ door_open: false })} handle="moneyplayzz" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("no seller renders nothing", () => {
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

  it("subscriber sees a Subscribed chip and no link", () => {
    render(
      <SubscribeDoor status={status({ viewer: { subscribed: true, is_owner: false } })} handle="moneyplayzz" />,
    );
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("subscriber with closed door still sees Subscribed", () => {
    render(
      <SubscribeDoor
        status={status({ door_open: false, viewer: { subscribed: true, is_owner: false } })}
        handle="moneyplayzz"
      />,
    );
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
