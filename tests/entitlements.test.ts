import { describe, expect, it } from "vitest";
import { resolveEntitlements } from "@/lib/entitlements";

describe("resolveEntitlements", () => {
  it("anon user gets nothing", () => {
    expect(resolveEntitlements(null, null)).toEqual({ isLoggedIn: false, isVip: false });
  });
  it("logged in free user is not vip", () => {
    expect(resolveEntitlements({ user: { id: "u1" } }, { tier: "free" }))
      .toEqual({ isLoggedIn: true, isVip: false });
  });
  it("vip tier unlocks vip", () => {
    expect(resolveEntitlements({ user: { id: "u1" } }, { tier: "vip" }))
      .toEqual({ isLoggedIn: true, isVip: true });
  });
  it("missing profile row means free", () => {
    expect(resolveEntitlements({ user: { id: "u1" } }, null))
      .toEqual({ isLoggedIn: true, isVip: false });
  });
});
