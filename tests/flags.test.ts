import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { tofEnabled } from "@/lib/flags";

describe("vipEnabled", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("is false when the env var is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "");
    const { vipEnabled } = await import("@/lib/flags");
    expect(vipEnabled()).toBe(false);
  });

  it("is true only for the literal string true", async () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    const { vipEnabled } = await import("@/lib/flags");
    expect(vipEnabled()).toBe(true);
  });
});

describe("tofEnabled", () => {
  it("is off by default and requires the accounts flag too", () => {
    vi.stubEnv("NEXT_PUBLIC_TOF_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "false");
    expect(tofEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    expect(tofEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_TOF_ENABLED", "false");
    expect(tofEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
