import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const fake = vi.hoisted(() => ({ row: {} as Record<string, boolean>, updates: [] as Record<string, boolean>[] }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: fake.row, error: null }) }) }),
      update: (patch: Record<string, boolean>) => ({
        eq: () => ({ select: async () => (fake.updates.push(patch), { data: [patch], error: null }) }),
      }),
    }),
  }),
}));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ session: { user: { id: "u1" } } }) }));

import { EmailPrefToggle } from "./EmailPrefToggle";

describe("EmailPrefToggle", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    fake.updates.length = 0;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("reads its own column and writes only that column", async () => {
    fake.row = { email_tof_deals: true };
    render(<EmailPrefToggle column="email_tof_deals" title="Email me when the daily hand drops" subtitle="One email per deal." ariaLabel="Toggle deal emails" />);
    const button = await screen.findByRole("button", { name: "Toggle deal emails" });
    expect(screen.getByText("Email me when the daily hand drops")).toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(fake.updates).toEqual([{ email_tof_deals: false }]));
  });
});
