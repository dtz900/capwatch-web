import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { CapperAvatar, vipRingClass } from "./CapperAvatar";

vi.mock("next/font/google", () => ({ Titan_One: () => ({ className: "stamp" }) }));

const VIP_RING = "ring-[var(--color-vip)]";

describe("CapperAvatar VIP ring", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("paints the purple ring for an eligible capper once Capper VIP is live", () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "true");
    const { container } = render(<CapperAvatar url={null} handle="peter" size={32} vipEligible />);
    expect(container.innerHTML).toContain(VIP_RING);
  });

  it("stays dark while the launch flag is off, whatever the row says", () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "false");
    const { container } = render(<CapperAvatar url={null} handle="peter" size={32} vipEligible />);
    expect(container.innerHTML).not.toContain(VIP_RING);
  });

  it("never rings an ineligible capper", () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "true");
    const { container } = render(<CapperAvatar url={null} handle="peter" size={32} />);
    expect(container.innerHTML).not.toContain(VIP_RING);
  });

  it("rings the fadeai_ gradient avatar too", () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "true");
    const { container } = render(
      <CapperAvatar url={null} handle="fadeai_" size={32} apiIntegrated vipEligible />,
    );
    // That branch carries an inline blue glow that beats any ring class, so
    // the ring has to ride inside the inline box-shadow itself.
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.style.boxShadow).toContain("var(--color-vip)");
    expect(outer.style.boxShadow).toContain("rgba(37, 99, 235, 0.45)");
  });

  it("tightens the offset for small slate chips", () => {
    expect(vipRingClass(22)).toContain("ring-offset-1");
    expect(vipRingClass(32)).toContain("ring-offset-2");
  });
});
