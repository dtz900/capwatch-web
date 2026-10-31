import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
const vip = vi.hoisted(() => ({ getVipMe: vi.fn() }));
vi.mock("@/lib/vip/client", () => vip);

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

describe("AvatarMenu profile link", () => {
  it("links a claimed capper to their own profile", () => {
    auth.value = signedIn({ capper: { id: 325, handle: "zz_viptest", avatar_url: null } });
    render(<AvatarMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("link", { name: "My profile" })).toHaveAttribute("href", "/cappers/zz_viptest");
  });

  it("finds a capper owned without X verification when the menu opens", async () => {
    vip.getVipMe.mockReset();
    vip.getVipMe.mockResolvedValue({ capper: { id: 325, handle: "zz_viptest" } });
    auth.value = signedIn({ session: { access_token: "tok", user: { id: "u1", email: "d@t.test" } } });
    render(<AvatarMenu />);
    expect(vip.getVipMe).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(await screen.findByRole("link", { name: "My profile" })).toHaveAttribute("href", "/cappers/zz_viptest");
    expect(vip.getVipMe).toHaveBeenCalledWith("tok");
  });

  it("has no profile link for an account that owns no capper", async () => {
    vip.getVipMe.mockReset();
    vip.getVipMe.mockResolvedValue({ capper: null });
    auth.value = signedIn({});
    render(<AvatarMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    await vi.waitFor(() => expect(vip.getVipMe).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "My profile" })).toBeNull();
  });
});

describe("AvatarMenu signed out", () => {
  it("Sign in remembers the current page so sign-in returns here, not My Tails", () => {
    auth.value = { session: null, entitlements: { isLoggedIn: false, isVip: false }, capper: null, profile: null };
    document.cookie = "ts_return_to=; path=/; max-age=0";
    window.history.replaceState(null, "", "/cappers/zz_viptest?range=last30");
    render(<AvatarMenu />);
    const link = screen.getByRole("link", { name: "Sign in" });
    fireEvent.click(link);
    expect(document.cookie).toContain("ts_return_to=%2Fcappers%2Fzz_viptest%3Frange%3Dlast30");
  });

  it("Sign in from the login page itself remembers nothing", () => {
    auth.value = { session: null, entitlements: { isLoggedIn: false, isVip: false }, capper: null, profile: null };
    document.cookie = "ts_return_to=; path=/; max-age=0";
    window.history.replaceState(null, "", "/login");
    render(<AvatarMenu />);
    fireEvent.click(screen.getByRole("link", { name: "Sign in" }));
    expect(document.cookie).not.toContain("ts_return_to=%2F");
  });
});
