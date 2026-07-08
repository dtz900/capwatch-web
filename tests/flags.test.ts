import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

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
