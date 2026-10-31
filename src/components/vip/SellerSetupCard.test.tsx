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
  return { postVipSeller: vi.fn(), startVipOnboarding: vi.fn(), VipApiError };
});
vi.mock("@/lib/vip/client", () => client);

import { SELLER_AGREEMENT_VERSION } from "@/lib/vip/terms";
import { SellerSetupCard } from "./SellerSetupCard";

const me: VipMe = {
  capper: { id: 7, handle: "moneyplayzz" },
  seller: null,
  eligibility: [{ sport: "MLB", eligible: true, eligible_since: "2026-10-01", fail_streak: 0 }],
  can_post_sports: ["MLB"],
  payments_enabled: true,
};

const TERMS = /I agree to the/;

function fillValid() {
  fireEvent.change(screen.getByLabelText("Monthly price (USD)"), { target: { value: "25" } });
  fireEvent.change(screen.getByLabelText("Your main book"), { target: { value: "draftkings" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("SellerSetupCard", () => {
  beforeEach(() => {
    auth.value = { session: { access_token: "tok" } };
    client.postVipSeller.mockReset();
    client.startVipOnboarding.mockReset();
  });

  it("start selling disabled until terms and price valid", () => {
    render(<SellerSetupCard me={me} onDone={() => {}} />);
    const button = screen.getByRole("button", { name: "Start selling" });
    const price = screen.getByLabelText("Monthly price (USD)");
    expect(screen.getByText("Between $10 and $99.")).toBeInTheDocument();
    expect(button).toBeDisabled();

    fireEvent.change(price, { target: { value: "25" } });
    expect(button).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    // A main book is required too.
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your main book"), { target: { value: "fanduel" } });
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
      { price_cents: 2500, accept_terms: true, terms_version: SELLER_AGREEMENT_VERSION, preferred_book: "draftkings" },
      "tok",
    );
    expect(onDone).not.toHaveBeenCalled();
  });

  it("submits terms version then redirects to Stripe", async () => {
    client.postVipSeller.mockResolvedValue({ price_cents: 2500, founding: true, status: "onboarding" });
    client.startVipOnboarding.mockResolvedValue({ url: "https://connect.stripe.com/x" });
    const assign = vi.fn();
    const orig = window.location;
    Object.defineProperty(window, "location", { value: { ...orig, assign }, writable: true, configurable: true });
    try {
      render(<SellerSetupCard me={me} onDone={() => {}} />);
      fillValid();
      fireEvent.click(screen.getByRole("button", { name: "Start selling" }));
      await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("https://connect.stripe.com/x"));
      expect(client.postVipSeller).toHaveBeenCalledWith(
        expect.objectContaining({ terms_version: SELLER_AGREEMENT_VERSION, accept_terms: true }),
        "tok",
      );
      expect(client.startVipOnboarding).toHaveBeenCalledWith("tok");
    } finally {
      Object.defineProperty(window, "location", { value: orig, writable: true, configurable: true });
    }
  });

  it("cannot confirm without agreeing", () => {
    render(<SellerSetupCard me={me} onDone={() => {}} />);
    fireEvent.change(screen.getByLabelText("Monthly price (USD)"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Your main book"), { target: { value: "draftkings" } });
    expect(screen.getByRole("button", { name: "Start selling" })).toBeDisabled();
    const link = screen.getByRole("link", { name: /^Seller Agreement/ });
    expect(link).toHaveAttribute("href", "/seller-agreement");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("confirm stays disabled while payments are not enabled", () => {
    render(<SellerSetupCard me={{ ...me, payments_enabled: false }} onDone={() => {}} />);
    fillValid();
    expect(screen.getByRole("button", { name: "Start selling" })).toBeDisabled();
    expect(screen.getByText("Payments aren't open yet.")).toBeInTheDocument();
  });

  it("refreshes via onDone when the onboarding link fails after the seller was created", async () => {
    client.postVipSeller.mockResolvedValue({ price_cents: 2500, founding: true, status: "onboarding" });
    client.startVipOnboarding.mockRejectedValue(new client.VipApiError(500, "boom"));
    const onDone = vi.fn();
    render(<SellerSetupCard me={me} onDone={onDone} />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Start selling" }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("setup shows requirement line when nothing is eligible", () => {
    render(
      <SellerSetupCard
        me={{ ...me, eligibility: [{ sport: "MLB", eligible: false, eligible_since: null, fail_streak: 2 }] }}
        onDone={() => {}}
      />,
    );
    expect(
      screen.getByText(
        "Start selling unlocks once a sport is eligible: a positive record over the last 30 days with at least 20 graded picks.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start selling" })).toBeNull();
  });

  it("double submit sends once", async () => {
    let resolve: (v: unknown) => void = () => {};
    client.postVipSeller.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<SellerSetupCard me={me} onDone={() => {}} />);
    fillValid();
    const button = screen.getByRole("button", { name: "Start selling" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(client.postVipSeller).toHaveBeenCalledTimes(1);
    resolve({});
  });

  it("maps a seller_denylisted 403 to the cannot-sell line", async () => {
    client.postVipSeller.mockRejectedValue(new client.VipApiError(403, "seller_denylisted"));
    render(<SellerSetupCard me={me} onDone={() => {}} />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Start selling" }));
    expect(await screen.findByText("This account cannot sell VIP picks.")).toBeInTheDocument();
  });
});
