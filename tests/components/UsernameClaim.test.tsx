import { describe, it, expect, vi, beforeEach } from "vitest";
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

function ChangeTrigger() {
  const { openChange } = useUsernameClaim();
  return <button onClick={openChange}>change</button>;
}

function signedInNoName(refreshProfile = vi.fn()): MockAuthState {
  return {
    session: { user: { id: "u1", email: "d@x.com" } },
    profile: { tier: "free", username: null, username_changed_at: null },
    entitlements: { isLoggedIn: true, isVip: false },
    refreshProfile,
  };
}

function stubSupabaseEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "x");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "y");
}

// Both spies are module-level, so call history from one test would otherwise
// satisfy the next test's waitFor before its own debounce had even fired.
beforeEach(() => {
  rpc.mockReset();
  update.mockReset();
});

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
    const input = screen.getByLabelText("Username");
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
    const input = await screen.findByLabelText("Username");
    fireEvent.change(input, { target: { value: "admin" } });
    expect(await screen.findByText(/reserved/i)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /claim/i })).toBeDisabled();
    vi.unstubAllEnvs();
  });

  it("keeps the button claimable after a save that failed for an unrelated reason", async () => {
    stubSupabaseEnv();
    rpc.mockResolvedValue({ data: true, error: null });
    update.mockResolvedValue({ error: { message: "could not connect to server" } });
    mockAuth.current = signedInNoName();
    render(<UsernameClaimProvider><Trigger onDone={() => {}} /></UsernameClaimProvider>);
    fireEvent.click(screen.getByText("play"));
    const input = await screen.findByLabelText("Username");
    await act(async () => {
      fireEvent.change(input, { target: { value: "dt_fades" } });
    });
    expect(await screen.findByText("AVAILABLE")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /claim/i });
    await act(async () => { fireEvent.click(button); });
    expect(await screen.findByText("Could not save that name. Try again.")).toBeInTheDocument();
    expect(button).toBeEnabled();
    vi.unstubAllEnvs();
  });

  it("marks a name the server already holds as taken and blocks the button", async () => {
    stubSupabaseEnv();
    rpc.mockResolvedValue({ data: false, error: null });
    mockAuth.current = signedInNoName();
    render(<UsernameClaimProvider><Trigger onDone={() => {}} /></UsernameClaimProvider>);
    fireEvent.click(screen.getByText("play"));
    const input = await screen.findByLabelText("Username");
    await act(async () => {
      fireEvent.change(input, { target: { value: "dt_fades" } });
    });
    expect(await screen.findByText("TAKEN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /claim/i })).toBeDisabled();
    vi.unstubAllEnvs();
  });

  it("blocks a change inside the 30-day window and says when the next one lands", async () => {
    stubSupabaseEnv();
    rpc.mockResolvedValue({ data: true, error: null });
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      profile: { tier: "free", username: "dt_fades", username_changed_at: tenDaysAgo },
      entitlements: { isLoggedIn: true, isVip: false },
      refreshProfile: vi.fn(),
    };
    render(<UsernameClaimProvider><ChangeTrigger /></UsernameClaimProvider>);
    fireEvent.click(screen.getByText("change"));
    const input = await screen.findByLabelText("Username");
    await act(async () => {
      fireEvent.change(input, { target: { value: "dt_tails" } });
    });
    expect(await screen.findByText("AVAILABLE")).toBeInTheDocument();
    expect(screen.getByText(/next change allowed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save username/i })).toBeDisabled();
    vi.unstubAllEnvs();
  });

  it("settles false and closes when the session drops while the modal is open", async () => {
    stubSupabaseEnv();
    const done = vi.fn();
    mockAuth.current = signedInNoName();
    const tree = () => <UsernameClaimProvider><Trigger onDone={done} /></UsernameClaimProvider>;
    const { rerender } = render(tree());
    fireEvent.click(screen.getByText("play"));
    expect(await screen.findByText(/pick a username/i)).toBeInTheDocument();

    mockAuth.current = { ...mockAuth.current, session: null };
    await act(async () => { rerender(tree()); });

    await waitFor(() => expect(done).toHaveBeenCalledWith(false));
    expect(screen.queryByText(/pick a username/i)).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("names the dialog by its heading, focuses the input, and settles false on Escape", async () => {
    stubSupabaseEnv();
    const done = vi.fn();
    mockAuth.current = signedInNoName();
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    render(<UsernameClaimProvider><Trigger onDone={done} /></UsernameClaimProvider>);
    fireEvent.click(screen.getByText("play"));

    const dialog = await screen.findByRole("dialog", { name: "Pick a username" });
    const input = screen.getByLabelText("Username");
    await waitFor(() => expect(input).toHaveFocus());
    // The availability badge has to sit in a live region to be announced.
    expect(input.closest("div")?.querySelector('[aria-live="polite"]')).toBeTruthy();

    await act(async () => { fireEvent.keyDown(dialog, { key: "Escape" }); });
    await waitFor(() => expect(done).toHaveBeenCalledWith(false));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
    opener.remove();
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

    const input = screen.getByLabelText("Username");
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
