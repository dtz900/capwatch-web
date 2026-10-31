import { describe, it, expect } from "vitest";
import { SELLER_AGREEMENT_VERSION, SUBSCRIBER_TERMS_VERSION, subscriberDisclosure } from "./terms";

describe("vip terms constants", () => {
  it("versions match the platform", () => {
    expect(SELLER_AGREEMENT_VERSION).toBe("2026-10-31");
    expect(SUBSCRIBER_TERMS_VERSION).toBe("2026-10-31");
  });

  it("disclosure formats whole-dollar prices without cents", () => {
    expect(subscriberDisclosure(2500)).toBe(
      "Renews every month at $25 until you cancel. Cancel anytime from Manage subscription; you keep access through the period you paid for. No refunds.",
    );
  });

  it("disclosure formats fractional prices with two decimals", () => {
    expect(subscriberDisclosure(2550)).toMatch(/^Renews every month at \$25\.50 until you cancel\./);
  });

  it("disclosure has no em dashes or double hyphens", () => {
    expect(subscriberDisclosure(1000)).not.toMatch(/\u2014|--/);
  });
});
