import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef } from "react";

/* After the OAuth return the replay effect re-opens the claim modal before
   tof_claim_x_identity() has answered. The modal must (a) close on its own
   once the claim sets a verified capper's username and (b) show a suggestion
   that arrives after mount, as long as the user has not typed. */

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({ rpc: async () => ({ data: true, error: null }) }),
}));
vi.mock("@/components/auth/VerifyWithX", () => ({ VerifyWithX: () => null }));

import { UsernameClaimProvider, useUsernameClaim } from "./UsernameClaim";

const results: boolean[] = [];
function Opener() {
  const { requireUsername } = useUsernameClaim();
  const called = useRef(false);
  useEffect(() => {
    if (called.current) return;
    called.current = true;
    void requireUsername().then((ok) => results.push(ok));
  }, [requireUsername]);
  return null;
}

function authValue(over: Record<string, unknown>) {
  return {
    session: { user: { id: "u1" } },
    profile: { tier: "free", username: null, username_changed_at: null, avatar_url: null },
    refreshProfile: vi.fn(async () => {}),
    suggestedUsername: null,
    ...over,
  };
}

describe("UsernameClaimProvider after an OAuth return", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    results.length = 0;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("closes the open claim modal and settles true once the username appears", async () => {
    auth.value = authValue({});
    const { rerender } = render(<UsernameClaimProvider><Opener /></UsernameClaimProvider>);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    auth.value = authValue({ profile: { tier: "free", username: "fadeai_", username_changed_at: "2026-09-23T18:00:00Z", avatar_url: null } });
    await act(async () => {
      rerender(<UsernameClaimProvider><Opener /></UsernameClaimProvider>);
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(results).toEqual([true]);
  });

  it("shows a suggestion that arrives after the modal mounted", async () => {
    auth.value = authValue({});
    const { rerender } = render(<UsernameClaimProvider><Opener /></UsernameClaimProvider>);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    auth.value = authValue({ suggestedUsername: "somefan" });
    await act(async () => {
      rerender(<UsernameClaimProvider><Opener /></UsernameClaimProvider>);
    });
    expect(screen.getByLabelText("Username")).toHaveValue("somefan");
  });
});
