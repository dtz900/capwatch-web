import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BetSlipProvider } from "@/components/my-tails/BetSlipContext";
import { BetSlipDrawer } from "@/components/my-tails/BetSlipDrawer";

const mockRows = [
  { id: 5, pick_id: 9001, stake: 1, odds: 142, capper_id: 69,
    capper_handle: "tonestakes", matchup: "PHI @ CIN", market: "ML",
    selection: "Reds ML", line: null, game_date: "2026-07-09",
    created_at: "2026-07-09T16:05:00Z" },
];

const insertSingle = vi.fn().mockResolvedValue({
  data: { ...mockRows[0], id: 6, pick_id: 9003, selection: "Tigers ML" }, error: null,
});
const supabaseMock = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockRows, error: null })),
      })),
    })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) })),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) })),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) })),
  })),
};

vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => supabaseMock }));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1" } },
    entitlements: { isVip: true },
  }),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchPickOutcomes: vi.fn().mockResolvedValue({
    9001: { outcome: "W", graded_at: "2026-07-09T05:00:00Z" },
  }),
}));

vi.mock("@/lib/betslip", async (importOriginal) => ({
  ...(await importOriginal<object>()),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});
afterEach(() => vi.clearAllMocks());

describe("BetSlipDrawer", () => {
  it("opens from the trigger tab and shows entries", async () => {
    render(
      <BetSlipProvider todayDate="2026-07-09">
        <BetSlipDrawer />
      </BetSlipProvider>
    );
    const trigger = await screen.findByLabelText(/open bet slip/i);
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByText("Reds ML")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/close bet slip/i));
    await waitFor(() =>
      expect(screen.queryByText("Reds ML")).not.toBeInTheDocument()
    );
  });
});
