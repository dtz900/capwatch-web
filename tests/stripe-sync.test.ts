import { describe, expect, it } from "vitest";
import { applySubscriptionState } from "@/lib/stripe-sync";

describe("applySubscriptionState", () => {
  it("active subscription grants vip", () => {
    const out = applySubscriptionState({
      userId: "u1", status: "active", customerId: "cus_1",
      subscriptionId: "sub_1", periodEnd: "2026-08-08T00:00:00Z",
    });
    expect(out.tier).toBe("vip");
    expect(out.subscription.status).toBe("active");
  });
  it("trialing also grants vip", () => {
    expect(applySubscriptionState({
      userId: "u1", status: "trialing", customerId: "c", subscriptionId: "s", periodEnd: null,
    }).tier).toBe("vip");
  });
  it("canceled drops to free", () => {
    expect(applySubscriptionState({
      userId: "u1", status: "canceled", customerId: "c", subscriptionId: "s", periodEnd: null,
    }).tier).toBe("free");
  });
});
