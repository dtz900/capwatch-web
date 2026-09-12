import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// In-memory stand-in for Upstash Redis. Shared across a test via closure so
// a withKvCache() write in one call is visible to a readLastKnownGood()
// read in the same test, the same way a real Redis instance would be.
let store: Map<string, unknown>;
let getSpy: ReturnType<typeof vi.fn>;
let setSpy: ReturnType<typeof vi.fn>;

vi.mock("@upstash/redis", () => {
  return {
    // Must be a real function (not an arrow) so `new Redis(...)` in
    // kv-cache.ts's getClient() can construct it.
    Redis: vi.fn().mockImplementation(function RedisMock(this: {
      get: typeof getSpy;
      set: typeof setSpy;
    }) {
      this.get = getSpy;
      this.set = setSpy;
    }),
  };
});

beforeEach(() => {
  vi.resetModules();
  store = new Map();
  getSpy = vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null));
  setSpy = vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
    return "OK";
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("withKvCache", () => {
  it("on success writes both the primary key and a long-TTL key:lkg copy", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { withKvCache, LKG_TTL_SEC } = await import("./kv-cache");

    const fetcher = vi.fn(async () => ({ value: 42 }));
    const result = await withKvCache("k1", 15, fetcher);

    expect(result).toEqual({ value: 42 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith("k1", { value: 42 }, { ex: 15 });
    expect(setSpy).toHaveBeenCalledWith("k1:lkg", { value: 42 }, { ex: LKG_TTL_SEC });
    expect(store.get("k1:lkg")).toEqual({ value: 42 });
  });

  it("readLastKnownGood returns the value withKvCache stored under key:lkg", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { withKvCache, readLastKnownGood } = await import("./kv-cache");

    await withKvCache("k2", 15, async () => ({ value: "hello" }));

    const stale = await readLastKnownGood<{ value: string }>("k2");
    expect(stale).toEqual({ value: "hello" });
  });

  it("readLastKnownGood returns null when nothing was ever written for that key", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { readLastKnownGood } = await import("./kv-cache");

    expect(await readLastKnownGood("never-written")).toBeNull();
  });

  it("without Redis configured, withKvCache is a pass-through and readLastKnownGood is a no-op", async () => {
    // Deliberately do not stub any UPSTASH_/KV_REST_API_ env vars.
    const { withKvCache, readLastKnownGood } = await import("./kv-cache");

    const fetcher = vi.fn(async () => ({ value: "fresh" }));
    const result = await withKvCache("k3", 15, fetcher);

    expect(result).toEqual({ value: "fresh" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getSpy).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
    expect(await readLastKnownGood("k3")).toBeNull();
  });
});
