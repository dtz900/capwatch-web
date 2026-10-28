import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { VipMe } from "@/lib/vip/types";

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
  return { postVipSeller: vi.fn(), VipApiError };
});
vi.mock("@/lib/vip/client", () => client);

import { SellerSetupCard } from "./SellerSetupCard";

const me: VipMe = {
  capper: { id: 7, handle: "moneyplayzz" },
  seller: null,
  eligibility: [{ sport: "MLB", eligible: true, eligible_since: "2026-10-01", fail_streak: 0 }],
  can_post_sports: ["MLB"],
};

const TERMS =
  "I understand I can only sell while my public TailSlips record is positive in that sport over the last 30 days, that VIP picks are revealed to everyone when the game starts, and that TailSlips keeps 15% of each subscription (10% for founding sellers).";

function fillValid() {
  fireEvent.change(screen.getByLabelText("Monthly price (USD)"), { target: { value: "25" } });
  fireEvent.click(screen.getByLabelText(TERMS));
}

describe("SellerSetupCard", () => {
  beforeEach(() => {
    auth.value = { session: { access_token: "tok" } };
    client.postVipSeller.mockReset();
  });

  it("start selling disabled until terms and price valid", () => {
    render(<SellerSetupCard me={me} onDone={() => {}} />);
    const button = screen.getByRole("button", { name: "Start selling" });
    const price = screen.getByLabelText("Monthly price (USD)");
    expect(screen.getByText("Between $10 and $99.")).toBeInTheDocument();
    expect(button).toBeDisabled();

    fireEvent.change(price, { target: { value: "25" } });
    expect(button).toBeDisabled();

    fireEvent.click(screen.getByLabelText(TERMS));
    expect(button).toBeEnabled();

    for (const bad of ["9", "100", "25.5", "", "abc"]) {
      fireEvent.change(price, { target: { value: bad } });
      expect(button).toBeDisabled();
    }
    fireEvent.change(price, { target: { value: "10" } });
    expect(button).toBeEnabled();
    fireEvent.change(price, { target: { value: "99" } });
    expect(button).toBeEnabled();
  });

  it("setup shows eligibility message on 409", async () => {
    client.postVipSeller.mockRejectedValue(new client.VipApiError(409, "no_eligible_sport"));
    const onDone = vi.fn();
    render(<SellerSetupCard me={me} onDone={onDone} />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Start selling" }));
    expect(
      await screen.findByText("You need a positive 30-day record in at least one sport first."),
    ).toBeInTheDocument();
    expect(client.postVipSeller).toHaveBeenCalledWith(
      { price_cents: 2500, accept_terms: true },
      "tok",
    );
    expect(onDone).not.toHaveBeenCalled();
  });

  it("setup calls onDone after a successful create", async () => {
    client.postVipSeller.mockResolvedValue({
      capper_id: 7,
      price_cents: 2500,
      founding: true,
      status: "active",
    });
    const onDone = vi.fn();
    render(<SellerSetupCard me={me} onDone={onDone} />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Start selling" }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});
