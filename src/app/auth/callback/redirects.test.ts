import { describe, expect, it } from "vitest";
import { errorRedirectTarget } from "./redirects";

describe("errorRedirectTarget", () => {
  const origin = "https://tailslips.com";

  it("falls back to /login when no return cookie is set", () => {
    expect(errorRedirectTarget(origin, undefined, "bad link")).toBe("https://tailslips.com/login?error=bad%20link");
  });

  it("returns to the page the user left when the cookie is a safe path", () => {
    expect(errorRedirectTarget(origin, encodeURIComponent("/account"), "nope")).toBe("https://tailslips.com/account?error=nope");
  });

  it("appends with & when the return path already has a query", () => {
    expect(errorRedirectTarget(origin, encodeURIComponent("/slate?d=1"), "x")).toBe("https://tailslips.com/slate?d=1&error=x");
  });

  it("ignores protocol-relative and absolute cookie values", () => {
    expect(errorRedirectTarget(origin, encodeURIComponent("//evil.com"), "x")).toBe("https://tailslips.com/login?error=x");
    expect(errorRedirectTarget(origin, encodeURIComponent("https://evil.com"), "x")).toBe("https://tailslips.com/login?error=x");
  });
});
