import { describe, expect, it, vi } from "vitest";
import { breachCount, setPasswordErrorMessage, signInErrorMessage, validateNewPassword } from "./password-auth";

describe("validateNewPassword", () => {
  it("rejects short passwords and accepts 12 or more characters", () => {
    expect(validateNewPassword("12345678901")).toMatch(/at least 12/);
    expect(validateNewPassword("123456789012")).toBeNull();
  });

  it("rejects passwords past the 72 byte bcrypt limit, counted in bytes", () => {
    expect(validateNewPassword("a".repeat(72))).toBeNull();
    expect(validateNewPassword("a".repeat(73))).toMatch(/under 72/);
    expect(validateNewPassword("é".repeat(37))).toMatch(/under 72/);
  });
});

describe("signInErrorMessage", () => {
  it("says a wrong or missing password plainly", () => {
    expect(signInErrorMessage({ code: "invalid_credentials" })).toMatch(/do not match/);
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

describe("breachCount", () => {
  // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
  const body = [
    "0018A45C4D1DEF81644B54AB7F969B88D65:3",
    "1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824",
    "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0",
  ].join(String.fromCharCode(13, 10));

  it("sends only the first five hash characters and reads the matching count", async () => {
    const urls: string[] = [];
    const fetchImpl = async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return new Response(body, { status: 200 });
    };
    expect(await breachCount("password", fetchImpl as typeof fetch)).toBe(9545824);
    const url = urls[0];
    expect(url).toBe("https://api.pwnedpasswords.com/range/5BAA6");
    expect(url).not.toContain("1E4C9B93");
  });

  it("returns 0 for a password that is not listed", async () => {
    const fetchImpl = vi.fn(async () => new Response(body, { status: 200 }));
    expect(await breachCount("a password nobody has leaked 7741", fetchImpl as unknown as typeof fetch)).toBe(0);
  });

  it("throws when the lookup fails, so an unchecked password is never saved", async () => {
    const down = vi.fn(async () => new Response("", { status: 503 }));
    await expect(breachCount("password", down as unknown as typeof fetch)).rejects.toThrow(/503/);
  });
});
