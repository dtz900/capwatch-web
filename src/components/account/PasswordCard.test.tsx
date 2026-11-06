import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const fake = vi.hoisted(() => ({
  calls: [] as { password: string }[],
  error: null as { code?: string; message?: string } | null,
}));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: {
      updateUser: async (patch: { password: string }) => (fake.calls.push(patch), { error: fake.error }),
    },
  }),
}));

import { PasswordCard } from "./PasswordCard";

describe("PasswordCard", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    fake.calls.length = 0;
    fake.error = null;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("blocks a short password without calling Supabase", async () => {
    render(<PasswordCard />);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/at least 8/)).toBeInTheDocument();
    expect(fake.calls).toEqual([]);
  });

  it("saves a valid password, clears the field and confirms", async () => {
    render(<PasswordCard />);
    const input = screen.getByLabelText("New password") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fake.calls).toEqual([{ password: "correct horse" }]));
    expect(await screen.findByText(/Password saved/)).toBeInTheDocument();
    expect(input.value).toBe("");
  });

  it("shows a plain message when Supabase refuses, and keeps the field", async () => {
    fake.error = { code: "same_password", message: "New password should be different from the old password." };
    render(<PasswordCard />);
    const input = screen.getByLabelText("New password") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/already your password/)).toBeInTheDocument();
    expect(input.value).toBe("correct horse");
    expect(screen.queryByText(/Password saved/)).toBeNull();
  });
});
