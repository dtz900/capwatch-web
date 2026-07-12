import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockAuth = vi.hoisted(() => ({ current: {} as any }));
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => mockAuth.current,
}));
import { AvatarMenu } from "@/components/auth/AvatarMenu";

describe("AvatarMenu", () => {
  it("shows Sign in pill when logged out", () => {
    mockAuth.current = {
      session: null,
      entitlements: { isLoggedIn: false, isVip: false },
      signOut: vi.fn(),
    };
    render(<AvatarMenu />);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("opens the menu with account links and no VIP framing while the tier is dark", () => {
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      entitlements: { isLoggedIn: true, isVip: false },
      signOut: vi.fn(),
    };
    render(<AvatarMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("d@x.com")).toBeInTheDocument();
    expect(screen.queryByText("Go VIP")).not.toBeInTheDocument();
    expect(screen.queryByText("VIP")).not.toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("shows Go VIP / VIP chip once the paid tier flag is on", () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_TIER_ENABLED", "true");
    try {
      mockAuth.current = {
        session: { user: { id: "u1", email: "d@x.com" } },
        entitlements: { isLoggedIn: true, isVip: false },
        signOut: vi.fn(),
      };
      const { unmount } = render(<AvatarMenu />);
      fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
      expect(screen.getByText("Go VIP")).toBeInTheDocument();
      unmount();

      mockAuth.current = {
        session: { user: { id: "u1", email: "d@x.com" } },
        entitlements: { isLoggedIn: true, isVip: true },
        signOut: vi.fn(),
      };
      render(<AvatarMenu />);
      fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
      expect(screen.getByText("VIP")).toBeInTheDocument();
      expect(screen.queryByText("Go VIP")).not.toBeInTheDocument();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
