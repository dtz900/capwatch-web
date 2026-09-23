import { describe, it, expect } from "vitest";
import { validateUsername, nextUsernameChange, RESERVED_USERNAMES } from "@/lib/tof/username";

describe("validateUsername", () => {
  it("accepts letters, digits, underscores, 3 to 20 chars", () => {
    expect(validateUsername("dt_fades")).toEqual({ ok: true });
    expect(validateUsername("Abc")).toEqual({ ok: true });
    expect(validateUsername("a".repeat(20))).toEqual({ ok: true });
  });
  it("rejects bad shapes with a reason", () => {
    expect(validateUsername("ab")).toEqual({ ok: false, reason: "3 to 20 characters" });
    expect(validateUsername("a".repeat(21))).toEqual({ ok: false, reason: "3 to 20 characters" });
    expect(validateUsername("dave thomas")).toEqual({ ok: false, reason: "letters, numbers, underscores only" });
    expect(validateUsername("@dave")).toEqual({ ok: false, reason: "letters, numbers, underscores only" });
    expect(validateUsername("")).toEqual({ ok: false, reason: "3 to 20 characters" });
  });
  it("rejects reserved names case-insensitively, including capper handles passed in", () => {
    expect(validateUsername("TailSlips")).toEqual({ ok: false, reason: "that name is reserved" });
    expect(validateUsername("Admin")).toEqual({ ok: false, reason: "that name is reserved" });
    expect(validateUsername("luckyluke", ["luckyluke"])).toEqual({ ok: false, reason: "that name is reserved" });
    expect(RESERVED_USERNAMES).toContain("fadeai");
  });
});

describe("nextUsernameChange", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  it("allows a change when never changed or older than 30 days", () => {
    expect(nextUsernameChange(null, now)).toBeNull();
    expect(nextUsernameChange("2026-08-01T00:00:00Z", now)).toBeNull();
  });
  it("returns the earliest allowed date inside the window", () => {
    expect(nextUsernameChange("2026-09-10T00:00:00Z", now)?.toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });
});
