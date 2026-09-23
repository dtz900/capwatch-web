import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));

import { AvatarMenu } from "./AvatarMenu";

function signedIn(over: Record<string, unknown>) {
  return {
    session: { user: { id: "u1", email: "d@t.test" } },
    entitlements: { isLoggedIn: true, isVip: false },
    signOut: vi.fn(),
    capper: null,
    profile: { tier: "free", username: "TailSlips", username_changed_at: null, avatar_url: null },
    ...over,
  };
}

describe("AvatarMenu avatar", () => {
  it("shows the uploaded or X photo in the menu button", () => {
    auth.value = signedIn({ profile: { tier: "free", username: "TailSlips", username_changed_at: null, avatar_url: "https://pbs/ts.jpg" } });
    render(<AvatarMenu />);
    const button = screen.getByRole("button", { name: "Account menu" });
    expect(button.querySelector("img")).toHaveAttribute("src", "https://pbs/ts.jpg");
  });

  it("prefers the verified capper's tracked photo", () => {
    auth.value = signedIn({
      capper: { id: 7, handle: "fadeai_", avatar_url: "https://pbs/capper.jpg" },
      profile: { tier: "free", username: "fadeai_", username_changed_at: null, avatar_url: "https://pbs/upload.jpg" },
    });
    render(<AvatarMenu />);
    expect(screen.getByRole("button", { name: "Account menu" }).querySelector("img")).toHaveAttribute("src", "https://pbs/capper.jpg");
  });

  it("falls back to the initial without a photo", () => {
    auth.value = signedIn({});
    render(<AvatarMenu />);
    const button = screen.getByRole("button", { name: "Account menu" });
    expect(button.querySelector("img")).toBeNull();
    expect(button).toHaveTextContent("T");
  });
});
