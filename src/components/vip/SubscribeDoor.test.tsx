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
    const link = screen.getByRole("link", { name: "Subscribe · $25/mo" });
    expect(link).toHaveAttribute("href", "/cappers/moneyplayzz/subscribe");
    expect(link).toHaveClass("bg-[var(--color-text)]");
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
    expect(screen.getByRole("link", { name: "Subscribe · $19.99/mo" })).toBeInTheDocument();
  });

  it("door closed shows one muted chip and no link", () => {
    render(<SubscribeDoor status={status({ door_open: false })} handle="moneyplayzz" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Not selling right now")).toBeInTheDocument();
  });

  it("door closed without a seller shows the same chip", () => {
    render(<SubscribeDoor status={status({ seller: null, door_open: false })} handle="moneyplayzz" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Not selling right now")).toBeInTheDocument();
  });

  it("door renders nothing for the owner", () => {
    const { container } = render(
      <SubscribeDoor status={status({ viewer: { subscribed: false, is_owner: true } })} handle="moneyplayzz" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("owner with closed door: slot stays empty (reasons are on the cards)", () => {
    const { container } = render(
      <SubscribeDoor
        status={status({ door_open: false, viewer: { subscribed: false, is_owner: true } })}
        handle="moneyplayzz"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("door shows a Subscribed chip instead of the button for a subscriber", () => {
    render(
      <SubscribeDoor status={status({ viewer: { subscribed: true, is_owner: false } })} handle="moneyplayzz" />,
    );
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("subscriber with closed door sees Subscribed and no link", () => {
    render(
      <SubscribeDoor
        status={status({ door_open: false, viewer: { subscribed: true, is_owner: false } })}
        handle="moneyplayzz"
      />,
    );
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.queryByText("Not selling right now")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
