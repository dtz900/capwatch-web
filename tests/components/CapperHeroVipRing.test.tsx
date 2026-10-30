import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CapperHero } from "@/components/capper/CapperHero";
import type { CapperProfile } from "@/lib/types";

const profile = {
  capper: { id: 7, handle: "zz_viptest", display_name: "VIP Test Capper", profile_image_url: null },
} as unknown as CapperProfile;

const avatar = (c: HTMLElement) => c.querySelector("header > div") as HTMLElement;

describe("CapperHero VIP ring", () => {
  it("rings the avatar in VIP purple for an eligible capper", () => {
    const { container } = render(<CapperHero profile={profile} windowAgg={undefined} vipRing />);
    expect(avatar(container).className).toContain("ring-[var(--color-vip)]");
  });

  it("leaves the avatar plain otherwise", () => {
    const { container } = render(<CapperHero profile={profile} windowAgg={undefined} />);
    expect(avatar(container).className).not.toContain("ring-");
  });
});
