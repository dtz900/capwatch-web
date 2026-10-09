import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// In-memory stand-in for Upstash Redis. Shared across a test via closure so
// a withKvCache() write in one call is visible to a readLastKnownGood()
// read in the same test, the same way a real Redis instance would be.
let store: Map<string, unknown>;
let getSpy: ReturnType<typeof vi.fn>;
let setSpy: ReturnType<typeof vi.fn>;
let incrSpy: ReturnType<typeof vi.fn>;
let expireSpy: ReturnType<typeof vi.fn>;

vi.mock("@upstash/redis", () => {
  return {
    // Must be a real function (not an arrow) so `new Redis(...)` in
    // kv-cache.ts's getClient() can construct it.
    Redis: vi.fn().mockImplementation(function RedisMock(this: {
      get: typeof getSpy;
      set: typeof setSpy;
      incr: typeof incrSpy;
      expire: typeof expireSpy;
    }) {
      this.get = getSpy;
      this.set = setSpy;
      this.incr = incrSpy;
      this.expire = expireSpy;
    }),
  };
});

beforeEach(() => {
  vi.resetModules();
  store = new Map();
  getSpy = vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null));
  incrSpy = vi.fn(async (key: string) => {
    const next = ((store.get(key) as number | undefined) ?? 0) + 1;
    store.set(key, next);
    return next;
  });
  expireSpy = vi.fn(async () => 1);
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

describe("kvRateLimit", () => {
  it("allows up to the limit in a window and blocks the next call", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { kvRateLimit } = await import("./kv-cache");

    expect(await kvRateLimit("ip-a", 2, 60)).toBe(true);
    expect(await kvRateLimit("ip-a", 2, 60)).toBe(true);
    expect(await kvRateLimit("ip-a", 2, 60)).toBe(false);
    // The TTL is paid for once, by the call that created the bucket.
    expect(expireSpy).toHaveBeenCalledTimes(1);
  });

  it("counts each key separately", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { kvRateLimit } = await import("./kv-cache");

    expect(await kvRateLimit("ip-b", 1, 60)).toBe(true);
    expect(await kvRateLimit("ip-c", 1, 60)).toBe(true);
    expect(await kvRateLimit("ip-b", 1, 60)).toBe(false);
  });

  it("fails open with no Redis configured, so telemetry is never lost to it", async () => {
    const { kvRateLimit } = await import("./kv-cache");
    for (let i = 0; i < 5; i++) {
      expect(await kvRateLimit("ip-d", 1, 60)).toBe(true);
    }
    expect(incrSpy).not.toHaveBeenCalled();
  });

  it("fails open when Redis raises", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    incrSpy.mockRejectedValueOnce(new Error("upstash down"));
    const { kvRateLimit } = await import("./kv-cache");

    expect(await kvRateLimit("ip-e", 1, 60)).toBe(true);
  });
});

describe("withKvCache fail-fast", () => {
  async function load() {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://kv.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    const mod = await import("./kv-cache");
    mod.__resetKvBreakerForTests();
    return mod;
  }

  it("a rejecting Redis falls through to upstream and is skipped for the breaker window", async () => {
    const { withKvCache } = await load();
    getSpy.mockImplementation(async () => {
      throw new Error("ERR This database has reached current Fixed plan limits");
    });
    const fetcher = vi.fn(async () => ({ v: 1 }));
    expect(await withKvCache("k", 60, fetcher)).toEqual({ v: 1 });
    expect(await withKvCache("k", 60, fetcher)).toEqual({ v: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(1); // second call skipped KV
    expect(setSpy).not.toHaveBeenCalled(); // no writes to a dead Redis
  });

  it("a hanging Redis read is abandoned after KV_READ_TIMEOUT_MS", async () => {
    const { withKvCache, KV_READ_TIMEOUT_MS } = await load();
    getSpy.mockImplementation(() => new Promise(() => {}));
    const t = Date.now();
    const out = await withKvCache("k", 60, async () => "fresh");
    expect(out).toBe("fresh");
    expect(Date.now() - t).toBeLessThan(KV_READ_TIMEOUT_MS + 200);
  });

  it("readLastKnownGood returns null without a Redis call while the breaker is open", async () => {
    const { withKvCache, readLastKnownGood } = await load();
    getSpy.mockImplementationOnce(async () => {
      throw new Error("down");
    });
    await withKvCache("k", 60, async () => 1);
    getSpy.mockClear();
    expect(await readLastKnownGood("k")).toBeNull();
    expect(getSpy).not.toHaveBeenCalled();
  });
});
