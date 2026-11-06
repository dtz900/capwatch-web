import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const fake = vi.hoisted(() => ({
  calls: [] as { password: string }[],
  error: null as { code?: string; message?: string } | null,
  owned: [] as { id: number }[],
  lookupError: null as { message: string } | null,
  breaches: 0 as number | "down",
}));
// capper stays null on purpose: the card must go by ownership, not by the X
// verification on the auth context (an owner linked without X is a seller too).
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ capper: null, session: { user: { id: "u1" } } }),
}));
vi.mock("@/lib/password-auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/password-auth")>()),
  breachCount: async () => {
    if (fake.breaches === "down") throw new Error("breach lookup failed: 503");
    return fake.breaches;
  },
}));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: {
      updateUser: async (patch: { password: string }) => (fake.calls.push(patch), { error: fake.error }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ limit: async () => ({ data: fake.lookupError ? null : fake.owned, error: fake.lookupError }) }),
      }),
    }),
  }),
}));

import { PasswordCard } from "./PasswordCard";

describe("PasswordCard", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    fake.calls.length = 0;
    fake.error = null;
    fake.owned = [];
    fake.lookupError = null;
    fake.breaches = 0;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("blocks a short password without calling Supabase", async () => {
    render(<PasswordCard />);
    fireEvent.change(await screen.findByLabelText("New password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Use at least 12/)).toBeInTheDocument();
    expect(fake.calls).toEqual([]);
  });

  it("saves a valid password, clears the field and confirms", async () => {
    render(<PasswordCard />);
    const input = (await screen.findByLabelText("New password")) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fake.calls).toEqual([{ password: "correct horse" }]));
    expect(await screen.findByText(/Password saved/)).toBeInTheDocument();
    expect(input.value).toBe("");
  });

  it("refuses a password found in a breach, and one it could not check", async () => {
    fake.breaches = 9545824;
    render(<PasswordCard />);
    fireEvent.change(await screen.findByLabelText("New password"), { target: { value: "password12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/appeared in a data breach/)).toBeInTheDocument();
    fake.breaches = "down";
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Could not check that password/)).toBeInTheDocument();
    expect(fake.calls).toEqual([]);
  });

  it("gives an account that owns a capper no way to set a password", async () => {
    fake.owned = [{ id: 7 }];
    render(<PasswordCard />);
    expect(await screen.findByText(/Seller accounts sign in with the emailed link only/)).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("keeps the form hidden when the ownership lookup fails", async () => {
    fake.lookupError = { message: "boom" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PasswordCard />);
    expect(await screen.findByText(/Could not load password settings/)).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).toBeNull();
    vi.restoreAllMocks();
  });

  it("shows a plain message when Supabase refuses, and keeps the field", async () => {
    fake.error = { code: "same_password", message: "New password should be different from the old password." };
    render(<PasswordCard />);
    const input = (await screen.findByLabelText("New password")) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/already your password/)).toBeInTheDocument();
    expect(input.value).toBe("correct horse");
    expect(screen.queryByText(/Password saved/)).toBeNull();
  });
});
