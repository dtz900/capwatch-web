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

const supa = vi.hoisted(() => ({ exchangeError: null as null | { message: string; code?: string } }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({
    auth: { exchangeCodeForSession: async () => ({ error: supa.exchangeError }) },
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
});
