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

  it("opens the menu with account links for a free user", () => {
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      entitlements: { isLoggedIn: true, isVip: false },
      signOut: vi.fn(),
    };
    render(<AvatarMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("Go VIP")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("shows the VIP chip for a subscriber", () => {
    mockAuth.current = {
      session: { user: { id: "u1", email: "d@x.com" } },
      entitlements: { isLoggedIn: true, isVip: true },
      signOut: vi.fn(),
    };
    render(<AvatarMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.queryByText("Go VIP")).not.toBeInTheDocument();
  });
});
