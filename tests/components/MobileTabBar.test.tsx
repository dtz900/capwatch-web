import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileTabBar } from "@/components/nav/MobileTabBar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

describe("MobileTabBar", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReset();
  });

  it("renders 4 tabs with labels", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<MobileTabBar />);
    expect(screen.getByText("Slate")).toBeInTheDocument();
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Cappers")).toBeInTheDocument();
    expect(screen.getByText("Methodology")).toBeInTheDocument();
  });

  it("marks the active tab via aria-current when path matches", () => {
    vi.mocked(usePathname).mockReturnValue("/slate");
    render(<MobileTabBar />);
    const slateTab = screen.getByText("Slate").closest("a");
    expect(slateTab).toHaveAttribute("aria-current", "page");
  });

  it("treats / as Leaderboard active", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<MobileTabBar />);
    const leaderboardTab = screen.getByText("Leaderboard").closest("a");
    expect(leaderboardTab).toHaveAttribute("aria-current", "page");
  });

  it("is hidden on desktop via sm:hidden class", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    const { container } = render(<MobileTabBar />);
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("sm:hidden");
  });
});
