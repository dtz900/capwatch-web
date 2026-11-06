import { describe, expect, it } from "vitest";
import { setPasswordErrorMessage, signInErrorMessage, validateNewPassword } from "./password-auth";

describe("validateNewPassword", () => {
  it("rejects short passwords and accepts 8 or more characters", () => {
    expect(validateNewPassword("1234567")).toMatch(/at least 8/);
    expect(validateNewPassword("12345678")).toBeNull();
  });

  it("rejects passwords past the 72 byte bcrypt limit, counted in bytes", () => {
    expect(validateNewPassword("a".repeat(72))).toBeNull();
    expect(validateNewPassword("a".repeat(73))).toMatch(/under 72/);
    expect(validateNewPassword("é".repeat(37))).toMatch(/under 72/);
  });
});

describe("signInErrorMessage", () => {
  it("points a wrong or missing password at the email sign-in", () => {
    expect(signInErrorMessage({ code: "invalid_credentials" })).toMatch(/email sign-in/);
    expect(signInErrorMessage({ message: "Invalid login credentials" })).toMatch(/do not match/);
  });

  it("names rate limiting and never echoes an unknown raw message", () => {
    expect(signInErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
    expect(signInErrorMessage({ message: "pq: internal detail" })).not.toMatch(/pq/);
  });
});

describe("setPasswordErrorMessage", () => {
  it("maps the Supabase codes a visitor can act on", () => {
    expect(setPasswordErrorMessage({ code: "same_password" })).toMatch(/already your password/);
    expect(setPasswordErrorMessage({ code: "weak_password" })).toMatch(/too easy/);
    expect(setPasswordErrorMessage({ code: "reauthentication_needed" })).toMatch(/sign back in by email/);
    expect(setPasswordErrorMessage({})).toMatch(/Could not save/);
  });
});
