import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/forms/EmailSignupForm", () => ({ EmailSignupForm: () => null }));

import { BrandFooter } from "./BrandFooter";

afterEach(() => vi.unstubAllEnvs());

describe("BrandFooter", () => {
  it("shows VIP rules link only when flag on", () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "false");
    const off = render(<BrandFooter />);
    expect(screen.queryByRole("link", { name: "VIP rules" })).toBeNull();
    off.unmount();

    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "true");
    render(<BrandFooter />);
    expect(screen.getByRole("link", { name: "VIP rules" }).getAttribute("href")).toBe("/vip-rules");
    const legal = screen.getByRole("link", { name: "Terms of Service" }).parentElement!;
    expect(legal.textContent).not.toContain("\uFFFD");
    expect(legal.textContent).toContain("Privacy Policy \u00B7 VIP rules");
  });
});
