import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* The return cookie (ts_return_to) is written by ordinary sign-in buttons
   before they push to /login, so a failed magic link must still land on
   /login with its message (Inferno, 2026-08-16). Only the identity-link flow
   (ts_link_return, written by linkX) sends a failure back to the page the
   user left. */

const jarState = vi.hoisted(() => ({ cookies: new Map<string, string>(), deleted: [] as string[] }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jarState.cookies.has(name) ? { value: jarState.cookies.get(name) } : undefined),
    delete: (name: string) => {
      jarState.deleted.push(name);
      jarState.cookies.delete(name);
    },
  }),
}));

const supa = vi.hoisted(() => ({
  exchangeError: null as null | { message: string; code?: string },
  verifyError: null as null | { message: string },
  verifyCalls: [] as unknown[],
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({
    auth: {
      exchangeCodeForSession: async () => ({ error: supa.exchangeError }),
      verifyOtp: async (args: unknown) => {
        supa.verifyCalls.push(args);
        return { error: supa.verifyError };
      },
    },
  }),
}));

import { GET } from "./route";

async function location(url: string): Promise<string> {
  const res = await GET(new Request(url));
  return res.headers.get("location") ?? "";
}

describe("auth callback error routing", () => {
  beforeEach(() => {
    jarState.cookies.clear();
    jarState.deleted.length = 0;
    supa.exchangeError = null;
    supa.verifyError = null;
    supa.verifyCalls.length = 0;
  });
  afterEach(() => vi.restoreAllMocks());

  it("sends a failed magic-link exchange to /login even when a sign-in return cookie is set", async () => {
    jarState.cookies.set("ts_return_to", encodeURIComponent("/cappers/bigbuckbets"));
    supa.exchangeError = { message: "flow_state_not_found", code: "flow_state_not_found" };
    const loc = await location("https://tailslips.com/auth/callback?code=abc");
    expect(loc.startsWith("https://tailslips.com/login?error=")).toBe(true);
  });

  it("sends a failed identity link back to the page the user left", async () => {
    jarState.cookies.set("ts_link_return", encodeURIComponent("/account"));
    const loc = await location("https://tailslips.com/auth/callback?error=access_denied&error_description=User%20denied");
    expect(loc).toBe("https://tailslips.com/account?error=User%20denied");
    expect(jarState.deleted).toContain("ts_link_return");
  });

  it("a successful link returns to the link page and clears both cookies", async () => {
    jarState.cookies.set("ts_return_to", encodeURIComponent("/"));
    jarState.cookies.set("ts_link_return", encodeURIComponent("/account"));
    const loc = await location("https://tailslips.com/auth/callback?code=abc");
    expect(loc).toBe("https://tailslips.com/account");
    expect(jarState.cookies.size).toBe(0);
  });

  it("a successful sign-in returns to the sign-in page", async () => {
    jarState.cookies.set("ts_return_to", encodeURIComponent("/cappers/bigbuckbets"));
    const loc = await location("https://tailslips.com/auth/callback?code=abc");
    expect(loc).toBe("https://tailslips.com/cappers/bigbuckbets");
  });

  it("a token_hash link verifies on tailslips.com and returns to the sign-in page", async () => {
    jarState.cookies.set("ts_return_to", encodeURIComponent("/cappers/bigbuckbets"));
    const loc = await location("https://tailslips.com/auth/callback?token_hash=th1&type=magiclink");
    expect(supa.verifyCalls).toEqual([{ token_hash: "th1", type: "magiclink" }]);
    expect(loc).toBe("https://tailslips.com/cappers/bigbuckbets");
  });

  it("a failed token_hash verify lands on /login with a message", async () => {
    supa.verifyError = { message: "Email link is invalid or has expired" };
    const loc = await location("https://tailslips.com/auth/callback?token_hash=th1&type=magiclink");
    expect(loc.startsWith("https://tailslips.com/login?error=")).toBe(true);
  });

  it("rejects a token_hash with an unexpected type without calling Supabase", async () => {
    const loc = await location("https://tailslips.com/auth/callback?token_hash=th1&type=recovery");
    expect(supa.verifyCalls).toHaveLength(0);
    expect(loc.startsWith("https://tailslips.com/login?error=")).toBe(true);
  });
});
