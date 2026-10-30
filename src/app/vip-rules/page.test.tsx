import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/vip-rules",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/components/nav/TopNav", () => ({ TopNav: () => null }));

import VipRules from "./page";

afterEach(() => vi.unstubAllEnvs());

function enableFlag() {
  vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "true");
}

describe("vip-rules page", () => {
  it("renders the five section headings", () => {
    enableFlag();
    const { container } = render(<VipRules />);
    const heads = Array.from(container.querySelectorAll("h2")).map((h) => h.textContent);
    expect(heads).toEqual([
      "Who can sell",
      "What a VIP pick is",
      "What subscribers get",
      "Money",
      "Not advice",
    ]);
  });

  it("404 when flag off", () => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "false");
    expect(() => render(<VipRules />)).toThrow("NEXT_NOT_FOUND");
  });
});
