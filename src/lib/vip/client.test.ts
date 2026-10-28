import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE } from "@/lib/config";
import {
  VipApiError,
  getVipCapperStatus,
  postVipSeller,
  vipFetch,
} from "@/lib/vip/client";
import { isLockedPick } from "@/lib/vip/types";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("vipFetch", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("vipFetch sends bearer when token given", async () => {
    const fn = mockFetch(200, { ok: true });
    const out = await vipFetch<{ ok: boolean }>("/api/vip/me", { token: "tok" });
    expect(out).toEqual({ ok: true });
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/vip/me`);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
    expect(init.cache).toBe("no-store");
  });

  it("vipFetch omits authorization when token null", async () => {
    const fn = mockFetch(200, {});
    await vipFetch("/api/vip/me", { token: null });
    expect(new Headers(fn.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("vipFetch throws vip_403 on 403", async () => {
    mockFetch(403, { detail: "no_claimed_capper" });
    const err = (await vipFetch("/api/vip/me", { token: "t" }).catch((e) => e)) as VipApiError;
    expect(err).toBeInstanceOf(VipApiError);
    expect(err.message).toBe("vip_403");
    expect(err.status).toBe(403);
    expect(err.detail).toBe("no_claimed_capper");
  });

  it("sets JSON content type and serializes body for writes", async () => {
    const fn = mockFetch(200, { capper_id: 1 });
    await postVipSeller({ price_cents: 1500, accept_terms: true }, "t");
    const [, init] = fn.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ price_cents: 1500, accept_terms: true });
  });

  it("falls back to status text when no detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("boom", { status: 500, statusText: "Server Error" })),
    );
    const err = (await vipFetch("/x").catch((e) => e)) as VipApiError;
    expect(err.message).toBe("vip_500");
    expect(err.detail).toBe("Server Error");
  });

  it("getVipCapperStatus hits the capper path", async () => {
    const fn = mockFetch(200, {});
    await getVipCapperStatus(42, "t");
    expect(fn.mock.calls[0][0]).toBe(`${API_BASE}/api/vip/cappers/42`);
  });
});

describe("isLockedPick", () => {
  it("discriminates full picks from summaries", () => {
    expect(isLockedPick({ pick_id: 1, sport: "MLB", reveal_at: "x", posted_at: "y" })).toBe(false);
    expect(isLockedPick({ selection: "s" } as never)).toBe(true);
  });
});
