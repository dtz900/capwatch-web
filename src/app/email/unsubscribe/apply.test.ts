import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  configured: true,
  fail: false,
  updates: [] as { patch: Record<string, boolean>; userId: string }[],
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabase: () =>
    fake.configured
      ? {
          from: () => ({
            update: (patch: Record<string, boolean>) => ({
              eq: async (_col: string, userId: string) => {
                if (fake.fail) return { error: { message: "boom" } };
                fake.updates.push({ patch, userId });
                return { error: null };
              },
            }),
          }),
        }
      : null,
}));

import { applyUnsub, validUnsubToken } from "./apply";
import { POST, GET } from "@/app/api/email/unsubscribe/route";
import { NextRequest } from "next/server";

const SECRET = "test-secret";
const USER = "51f4496a-0000-4000-8000-000000000001";
// Same scheme as the platform's core/email_unsub.py make_unsub_token.
const sign = (payload: string) => crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

describe("email unsubscribe", () => {
  beforeEach(() => {
    vi.stubEnv("EMAIL_UNSUB_SECRET", SECRET);
    fake.configured = true;
    fake.fail = false;
    fake.updates.length = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("accepts the platform's tokens per kind and rejects a token moved to another kind", () => {
    expect(validUnsubToken(USER, sign(USER), undefined)).toBe(true);
    expect(validUnsubToken(USER, sign(`${USER}:tof`), "tof")).toBe(true);
    expect(validUnsubToken(USER, sign(`${USER}:vip`), "vip")).toBe(true);
    expect(validUnsubToken(USER, sign(USER), "tof")).toBe(false);
    expect(validUnsubToken(USER, sign(`${USER}:tof`), "vip")).toBe(false);
  });

  it("rejects malformed ids, malformed tokens and a missing secret", () => {
    expect(validUnsubToken("not-a-uuid", sign("not-a-uuid"), undefined)).toBe(false);
    expect(validUnsubToken(USER, "abc", undefined)).toBe(false);
    expect(validUnsubToken(USER, "", undefined)).toBe(false);
    vi.stubEnv("EMAIL_UNSUB_SECRET", "");
    expect(validUnsubToken(USER, sign(USER), undefined)).toBe(false);
  });

  it("flips only the column the kind names", async () => {
    expect(await applyUnsub(USER, sign(`${USER}:tof`), "tof")).toBe("ok");
    expect(await applyUnsub(USER, sign(USER), undefined)).toBe("ok");
    expect(fake.updates).toEqual([
      { patch: { email_tof_deals: false }, userId: USER },
      { patch: { email_tail_alerts: false }, userId: USER },
    ]);
  });

  it("writes nothing for a bad token and reports a failed write as an error", async () => {
    expect(await applyUnsub(USER, sign("someone-else"), "tof")).toBe("invalid");
    expect(fake.updates).toEqual([]);
    fake.fail = true;
    expect(await applyUnsub(USER, sign(`${USER}:tof`), "tof")).toBe("error");
    fake.fail = false;
    fake.configured = false;
    expect(await applyUnsub(USER, sign(`${USER}:tof`), "tof")).toBe("error");
  });

  it("one-click POST: 200 on a good token, 400 on a bad one, 500 when the write fails", async () => {
    const url = (t: string) => `https://tailslips.com/api/email/unsubscribe?u=${USER}&t=${t}&k=tof`;
    const post = (t: string) =>
      POST(new NextRequest(url(t), { method: "POST", body: "List-Unsubscribe=One-Click" }));
    const good = sign(`${USER}:tof`);
    expect((await post(good)).status).toBe(200);
    expect(fake.updates).toEqual([{ patch: { email_tof_deals: false }, userId: USER }]);
    expect((await post("0".repeat(64))).status).toBe(400);
    fake.fail = true;
    expect((await post(good)).status).toBe(500);
  });

  it("GET on the header URL sends a person to the page with the same link", () => {
    const res = GET(new NextRequest(`https://tailslips.com/api/email/unsubscribe?u=${USER}&t=abc&k=tof`));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`https://tailslips.com/email/unsubscribe?u=${USER}&t=abc&k=tof`);
    expect(fake.updates).toEqual([]);
  });
});
