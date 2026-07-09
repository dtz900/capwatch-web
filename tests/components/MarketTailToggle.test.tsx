import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockAuth = vi.hoisted(() => ({ current: {} as any }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => mockAuth.current }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => null }));
import { MarketTailToggle } from "@/components/capper/MarketTailToggle";

describe("MarketTailToggle", () => {
  it("renders nothing for a non-VIP user", () => {
    mockAuth.current = {
      session: null,
      entitlements: { isLoggedIn: false, isVip: false },
    };
    const { container } = render(<MarketTailToggle capperId={2} market="HRR" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the plain tail control for a VIP", () => {
    mockAuth.current = {
      session: { user: { id: "u1" } },
      entitlements: { isLoggedIn: true, isVip: true },
    };
    render(<MarketTailToggle capperId={2} market="HRR" />);
    const btn = screen.getByRole("button", { name: /^tail$/i });
    expect(btn).toBeEnabled();
  });
});
