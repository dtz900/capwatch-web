import { describe, expect, it } from "vitest";
import { FRESH_SIGNUP_WINDOW_MS, isFreshSignup, signupFiredKey } from "./x-pixel";

const NOW = Date.parse("2026-11-04T20:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("isFreshSignup", () => {
  it("counts an email confirmed moments ago", () => {
    expect(isFreshSignup({ email_confirmed_at: ago(30_000), created_at: ago(600_000) }, NOW)).toBe(true);
  });

  it("ignores a returning user whose email was confirmed long ago", () => {
    expect(isFreshSignup({ email_confirmed_at: ago(3 * 86_400_000), created_at: ago(3 * 86_400_000) }, NOW)).toBe(false);
  });

  it("uses confirmation, not creation: magic-link users are created when the link is requested", () => {
    expect(isFreshSignup({ email_confirmed_at: ago(10_000), created_at: ago(40 * 60_000) }, NOW)).toBe(true);
  });

  it("falls back to confirmed_at, then created_at", () => {
    expect(isFreshSignup({ confirmed_at: ago(10_000) }, NOW)).toBe(true);
    expect(isFreshSignup({ created_at: ago(10_000) }, NOW)).toBe(true);
  });

  it("closes at the window edge", () => {
    expect(isFreshSignup({ email_confirmed_at: ago(FRESH_SIGNUP_WINDOW_MS + 1) }, NOW)).toBe(false);
  });

  it("is false with no usable timestamp", () => {
    expect(isFreshSignup({}, NOW)).toBe(false);
    expect(isFreshSignup({ email_confirmed_at: "not a date" }, NOW)).toBe(false);
  });
});

describe("signupFiredKey", () => {
  it("is per user", () => {
    expect(signupFiredKey("abc")).toBe("ts_x_signup_fired:abc");
  });
});
