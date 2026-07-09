import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockAuth = vi.hoisted(() => ({ current: {} as any }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => mockAuth.current }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { EmptyStable } from "@/components/my-tails/EmptyStable";
import type { CapperRow } from "@/lib/types";

const row = (id: number, handle: string): CapperRow =>
  ({ capper_id: String(id), handle, display_name: handle.toUpperCase(), profile_image_url: null,
     units_profit: 10 + id, roi_pct: 5, win_rate: 0.5, picks_count: 100,
     current_day_streak: 0, trajectory_units: [0, 1], last_picks: [], live_picks_count: 0,
   } as unknown as CapperRow);

describe("EmptyStable", () => {
  it("pitches the stable and renders a TAIL button per suggested capper", () => {
    mockAuth.current = { session: null, entitlements: { isLoggedIn: false, isVip: false } };
    render(<EmptyStable suggestions={[row(1, "a"), row(2, "b"), row(3, "c")]} />);
    expect(screen.getByText(/build your stable/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\+ tail/i })).toHaveLength(3);
  });
});
