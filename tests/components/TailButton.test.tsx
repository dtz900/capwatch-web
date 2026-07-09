// tests/components/TailButton.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockAuth = vi.hoisted(() => ({ current: {} as any }));
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => mockAuth.current,
}));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => null,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { TailButton } from "@/components/auth/TailButton";

describe("TailButton", () => {
  it("renders + TAIL for a logged-out visitor (enabled, it is the hook)", () => {
    mockAuth.current = {
      session: null,
      entitlements: { isLoggedIn: false, isVip: false },
    };
    render(<TailButton capperId={2} size="hero" />);
    const btn = screen.getByRole("button", { name: /\+ tail/i });
    expect(btn).toBeEnabled();
  });
});
