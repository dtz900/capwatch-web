import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

interface ProfileRow {
  tier: string;
  username: string | null;
  username_changed_at: string | null;
}
interface ReadResult {
  data: ProfileRow | null;
  error: { code?: string; message: string } | null;
}

const readResult = vi.hoisted(() => ({ current: { data: null, error: null } as ReadResult }));
const currentSession = vi.hoisted(() => ({
  current: null as { user: { id: string; email: string } } | null,
}));
const upsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: currentSession.current } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: () => Promise.resolve(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(readResult.current) }) }),
      upsert,
    }),
  }),
}));

import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";

function Probe() {
  const { profile } = useAuth();
  return <div data-testid="tier">{profile ? profile.tier : "none"}</div>;
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "x");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "y");
  upsert.mockClear();
  currentSession.current = { user: { id: "u1", email: "d@x.com" } };
  readResult.current = { data: null, error: null };
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe("AuthProvider", () => {
  it("keeps the profile untouched and does not self-insert when the profile read errors", async () => {
    readResult.current = { data: null, error: { code: "42703", message: 'column ts_profiles.username does not exist' } };
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith("ts_profiles load failed:", expect.anything()));
    expect(screen.getByTestId("tier")).toHaveTextContent("none");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("still self-inserts a free row when the read succeeds with no row", async () => {
    readResult.current = { data: null, error: null };
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("tier")).toHaveTextContent("free"));
    await waitFor(() => expect(upsert).toHaveBeenCalledWith(
      { user_id: "u1", email: "d@x.com" },
      { onConflict: "user_id", ignoreDuplicates: true },
    ));
  });

  it("uses the row it read when one exists", async () => {
    readResult.current = { data: { tier: "vip", username: "dt_fades", username_changed_at: null }, error: null };
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("tier")).toHaveTextContent("vip"));
    expect(upsert).not.toHaveBeenCalled();
  });
});
