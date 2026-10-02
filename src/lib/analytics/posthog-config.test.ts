import { describe, expect, it } from "vitest";
import { EXCLUDE_FLAG_KEY, isExcludedBrowser, posthogKey } from "./posthog-config";

describe("posthogKey", () => {
  it("is null when unset or blank, so PostHog ships dark", () => {
    expect(posthogKey(undefined)).toBeNull();
    expect(posthogKey("   ")).toBeNull();
  });
  it("returns the trimmed key when set", () => {
    expect(posthogKey(" phc_abc ")).toBe("phc_abc");
  });
});

describe("isExcludedBrowser", () => {
  const store = (v: string | null) => ({ getItem: (k: string) => (k === EXCLUDE_FLAG_KEY ? v : null) });
  it("honors the /exclude-me flag", () => {
    expect(isExcludedBrowser(store("1"))).toBe(true);
    expect(isExcludedBrowser(store(null))).toBe(false);
  });
  it("treats missing or throwing storage as not excluded", () => {
    expect(isExcludedBrowser(null)).toBe(false);
    expect(isExcludedBrowser({ getItem: () => { throw new Error("blocked"); } })).toBe(false);
  });
});
