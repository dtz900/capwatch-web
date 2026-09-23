import { describe, expect, it } from "vitest";
import { displayAvatar, hasTwitterIdentity, parseClaimResult } from "./x-claim";

describe("hasTwitterIdentity", () => {
  it("is true only when a twitter identity is present", () => {
    expect(hasTwitterIdentity({ identities: [{ provider: "email" }, { provider: "twitter" }] })).toBe(true);
    expect(hasTwitterIdentity({ identities: [{ provider: "email" }] })).toBe(false);
    expect(hasTwitterIdentity({ identities: undefined })).toBe(false);
    expect(hasTwitterIdentity(null)).toBe(false);
  });
});

describe("parseClaimResult", () => {
  it("accepts each status shape", () => {
    expect(parseClaimResult({ status: "no_identity" })).toEqual({ status: "no_identity" });
    expect(parseClaimResult({ status: "no_capper", suggested_username: "bigbuckbets", avatar_url: null }))
      .toEqual({ status: "no_capper", suggested_username: "bigbuckbets", avatar_url: null });
    expect(parseClaimResult({ status: "claimed_by_other", handle: "lockcity" }))
      .toEqual({ status: "claimed_by_other", handle: "lockcity" });
    expect(parseClaimResult({ status: "verified", capper_id: 7, handle: "fadeai_", avatar_url: "https://p/x.jpg", username_set: true }))
      .toEqual({ status: "verified", capper_id: 7, handle: "fadeai_", avatar_url: "https://p/x.jpg", username_set: true });
  });
  it("returns null for anything else", () => {
    expect(parseClaimResult(null)).toBeNull();
    expect(parseClaimResult({ status: "verified" })).toBeNull();          // missing handle
    expect(parseClaimResult({ status: "nope" })).toBeNull();
    expect(parseClaimResult("verified")).toBeNull();
  });
  it("fills optional fields with null", () => {
    expect(parseClaimResult({ status: "no_capper" })).toEqual({ status: "no_capper", suggested_username: null, avatar_url: null });
  });
});

describe("displayAvatar", () => {
  it("prefers the capper photo, then the profile upload", () => {
    expect(displayAvatar({ avatar_url: "up" }, { avatar_url: "cap" })).toBe("cap");
    expect(displayAvatar({ avatar_url: "up" }, { avatar_url: null })).toBe("up");
    expect(displayAvatar({ avatar_url: "up" }, null)).toBe("up");
    expect(displayAvatar({ avatar_url: null }, null)).toBeNull();
    expect(displayAvatar(null, null)).toBeNull();
  });
});
