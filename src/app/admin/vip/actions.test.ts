import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { API_BASE } from "@/lib/config";
import { grantVipSubscriptionAction, revokeVipSubscriptionAction } from "./actions";

const input = { user_email: "a@b.com", capper: "swampy", days: 30 };
const row = { capper_id: 1, user_id: "u1", status: "active", current_period_end: "2026-11-26T00:00:00Z" };

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("vip admin actions", () => {
  beforeEach(() => vi.stubEnv("CRON_SECRET", "test-secret"));
  afterEach(() => vi.unstubAllEnvs());

  it("grant action posts expected body with bearer", async () => {
    const fn = mockFetch(200, row);
    const res = await grantVipSubscriptionAction(input);
    expect(res).toEqual({ ok: true, row });
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/admin/vip/subscriptions`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-secret");
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it("revoke action uses DELETE", async () => {
    const fn = mockFetch(200, row);
    const res = await revokeVipSubscriptionAction(input);
    expect(res.ok).toBe(true);
    expect(fn.mock.calls[0][1].method).toBe("DELETE");
  });

  it("404 detail maps to readable error", async () => {
    mockFetch(404, { detail: "user_not_found" });
    expect(await grantVipSubscriptionAction(input)).toEqual({ ok: false, error: "User not found" });
    mockFetch(404, { detail: "capper_not_found" });
    expect(await grantVipSubscriptionAction(input)).toEqual({ ok: false, error: "Capper not found" });
    mockFetch(404, { detail: "subscription_not_found" });
    expect(await revokeVipSubscriptionAction(input)).toEqual({ ok: false, error: "No subscription to revoke" });
    mockFetch(500, {});
    expect(await grantVipSubscriptionAction(input)).toEqual({ ok: false, error: "Request failed (500)" });
  });

  it("non-JSON 404 falls through to generic error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;
    expect(await revokeVipSubscriptionAction(input)).toEqual({ ok: false, error: "Request failed (404)" });
  });

  it("action rejects days out of range", async () => {
    const fn = mockFetch(200, row);
    for (const days of [0, 1.5, -5, 99999, NaN]) {
      const err = { ok: false, error: "Days must be a whole number from 1 to 3650" };
      expect(await grantVipSubscriptionAction({ ...input, days })).toEqual(err);
      expect(await revokeVipSubscriptionAction({ ...input, days })).toEqual(err);
    }
    expect(fn).not.toHaveBeenCalled();
  });
});
