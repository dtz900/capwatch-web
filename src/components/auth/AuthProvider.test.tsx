import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const fake = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => fake.client,
}));

import { AuthProvider, useAuth } from "./AuthProvider";

function Probe() {
  const { capper, claimStatus, suggestedUsername, profile } = useAuth();
  return (
    <div data-testid="probe">
      {claimStatus}|{capper?.handle ?? ""}|{suggestedUsername ?? ""}|{profile?.username ?? ""}
    </div>
  );
}

function session(identities: { provider: string }[]) {
  return { user: { id: "u1", email: "d@t.test", identities } };
}

function fakeSupabase(sess: unknown, rpc: ReturnType<typeof vi.fn>, profileRow = { tier: "free", username: "dave", username_changed_at: null, avatar_url: null }) {
  return {
    auth: {
      getSession: async () => ({ data: { session: sess } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => {},
      linkIdentity: vi.fn(async () => ({ error: null })),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profileRow, error: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
    rpc,
  };
}

describe("AuthProvider verification", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not call the claim function without a twitter identity", async () => {
    const rpc = vi.fn();
    fake.client = fakeSupabase(session([{ provider: "email" }]), rpc);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toContain("|dave"));
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.getByTestId("probe").textContent?.startsWith("idle|")).toBe(true);
  });

  it("exposes the verified capper after a twitter identity claims", async () => {
    const rpc = vi.fn(async () => ({ data: { status: "verified", capper_id: 7, handle: "fadeai_", avatar_url: "https://p/x.jpg", username_set: true }, error: null }));
    fake.client = fakeSupabase(session([{ provider: "email" }, { provider: "twitter" }]), rpc);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toContain("verified|fadeai_|"));
    expect(rpc).toHaveBeenCalledWith("tof_claim_x_identity");
  });

  it("offers the X handle when the linked account is not a capper", async () => {
    const rpc = vi.fn(async () => ({ data: { status: "no_capper", suggested_username: "somefan", avatar_url: null }, error: null }));
    fake.client = fakeSupabase(session([{ provider: "twitter" }]), rpc);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toContain("no_capper||somefan|"));
  });

  it("leaves the state untouched when the claim call fails", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    fake.client = fakeSupabase(session([{ provider: "twitter" }]), rpc);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(screen.getByTestId("probe").textContent?.startsWith("idle||")).toBe(true);
    spy.mockRestore();
  });
});
