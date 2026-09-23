import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

interface MockAuthState {
  session: { user: { id: string; email: string } } | null;
  profile: { tier: string; username: string | null; username_changed_at: string | null } | null;
  entitlements: { isLoggedIn: boolean; isVip: boolean };
  refreshProfile: () => Promise<void>;
}

const mockAuth = vi.hoisted(() => ({
  current: {
    session: null,
    profile: null,
    entitlements: { isLoggedIn: false, isVip: false },
    refreshProfile: async () => {},
  } as MockAuthState,
}));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => mockAuth.current }));

const rpc = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    rpc,
    from: () => ({ update: (patch: { username: string }) => ({ eq: () => update(patch) }) }),
  }),
}));

import { UsernameClaimProvider, useUsernameClaim } from "@/components/auth/UsernameClaim";

function Trigger({ onDone }: { onDone: (ok: boolean) => void }) {
  const { requireUsername } = useUsernameClaim();
  return <button onClick={() => void requireUsername().then(onDone)}>play</button>;
}

describe("UsernameClaim", () => {
  it("resolves true without opening when a username exists", async () => {
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      profile: { tier: "free", username: "dt_fades", username_changed_at: null },
      entitlements: { isLoggedIn: true, isVip: false },
      refreshProfile: vi.fn(),
    };
    const done = vi.fn();
    render(<UsernameClaimProvider><Trigger onDone={done} /></UsernameClaimProvider>);
    fireEvent.click(screen.getByText("play"));
    await waitFor(() => expect(done).toHaveBeenCalledWith(true));
    expect(screen.queryByText(/pick a username/i)).not.toBeInTheDocument();
  });

  it("opens, checks availability, claims, and resolves true", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "x");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "y");
    rpc.mockResolvedValue({ data: true, error: null });
    update.mockResolvedValue({ error: null });
    const refreshProfile = vi.fn().mockResolvedValue(undefined);
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      profile: { tier: "free", username: null, username_changed_at: null },
      entitlements: { isLoggedIn: true, isVip: false },
      refreshProfile,
    };
    const done = vi.fn();
    render(<UsernameClaimProvider><Trigger onDone={done} /></UsernameClaimProvider>);
    fireEvent.click(screen.getByText("play"));
    expect(await screen.findByText(/pick a username/i)).toBeInTheDocument();
    const input = screen.getByLabelText(/username/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: "dt_fades" } });
    });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("tof_username_available", { candidate: "dt_fades" }));
    expect(await screen.findByText(/available/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /claim/i }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ username: "dt_fades" }));
    await waitFor(() => expect(done).toHaveBeenCalledWith(true));
    expect(refreshProfile).toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("shows the local rule before hitting the server and blocks reserved names", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "x");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "y");
    rpc.mockClear();
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      profile: { tier: "free", username: null, username_changed_at: null },
      entitlements: { isLoggedIn: true, isVip: false },
      refreshProfile: vi.fn(),
    };
    render(<UsernameClaimProvider><Trigger onDone={() => {}} /></UsernameClaimProvider>);
    fireEvent.click(screen.getByText("play"));
    const input = await screen.findByLabelText(/username/i);
    fireEvent.change(input, { target: { value: "admin" } });
    expect(await screen.findByText(/reserved/i)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /claim/i })).toBeDisabled();
    vi.unstubAllEnvs();
  });

  it("reuses the pending promise so a second requireUsername() call before the first settles also resolves true", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "x");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "y");
    rpc.mockResolvedValue({ data: true, error: null });
    update.mockResolvedValue({ error: null });
    const refreshProfile = vi.fn().mockResolvedValue(undefined);
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      profile: { tier: "free", username: null, username_changed_at: null },
      entitlements: { isLoggedIn: true, isVip: false },
      refreshProfile,
    };
    const doneA = vi.fn();
    const doneB = vi.fn();
    render(
      <UsernameClaimProvider>
        <Trigger onDone={doneA} />
        <Trigger onDone={doneB} />
      </UsernameClaimProvider>,
    );
    const [buttonA, buttonB] = screen.getAllByText("play");
    fireEvent.click(buttonA);
    expect(await screen.findByText(/pick a username/i)).toBeInTheDocument();
    // A second call while the modal is still open and unsettled must not
    // orphan the first caller's promise.
    fireEvent.click(buttonB);

    const input = screen.getByLabelText(/username/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: "dt_fades" } });
    });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("tof_username_available", { candidate: "dt_fades" }));
    fireEvent.click(screen.getByRole("button", { name: /claim/i }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ username: "dt_fades" }));
    await waitFor(() => expect(doneA).toHaveBeenCalledWith(true));
    await waitFor(() => expect(doneB).toHaveBeenCalledWith(true));
    expect(screen.queryByText(/pick a username/i)).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});
