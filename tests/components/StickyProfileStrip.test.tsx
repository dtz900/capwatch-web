import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";

// The strip only needs a hero ref and an aggregate to render.
const hero = vi.hoisted(() => ({ current: null as HTMLElement | null }));
vi.mock("@/components/capper/CapperFilterProvider", () => ({
  useCapperFilters: () => ({
    heroRef: hero,
    handle: "moneyplayzz",
    displayAgg: { units_profit: 62.1, roi_pct: 5 },
    displayTrajectory: [],
    label: "All time",
    profile: { capper: { handle: "moneyplayzz", profile_image_url: null } },
  }),
}));
vi.mock("@/components/capper/RecentTrajectory", () => ({ RecentTrajectory: () => null }));
vi.mock("@/components/leaderboard/CapperAvatar", () => ({ CapperAvatar: () => null }));

import { StickyProfileStrip } from "@/components/capper/StickyProfileStrip";

type Entry = { isIntersecting: boolean; boundingClientRect: { top: number } };
let fire: (e: Entry) => void = () => {};

beforeEach(() => {
  hero.current = document.createElement("div");
  class IO {
    constructor(cb: (entries: Entry[]) => void) { fire = (e) => cb([e]); }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", IO);
});

function strip(container: HTMLElement) {
  return container.firstElementChild as HTMLElement;
}

describe("StickyProfileStrip", () => {
  it("reveals once the hero has scrolled up past the nav", () => {
    const { container } = render(<StickyProfileStrip />);
    act(() => fire({ isIntersecting: false, boundingClientRect: { top: -300 } }));
    expect(strip(container).getAttribute("aria-hidden")).toBe("false");
  });

  it("stays hidden when the hero is below the fold (Tail or Fade open above it)", () => {
    const { container } = render(<StickyProfileStrip />);
    act(() => fire({ isIntersecting: false, boundingClientRect: { top: 1400 } }));
    expect(strip(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("hides again while the hero is on screen", () => {
    const { container } = render(<StickyProfileStrip />);
    act(() => fire({ isIntersecting: false, boundingClientRect: { top: -300 } }));
    act(() => fire({ isIntersecting: true, boundingClientRect: { top: 120 } }));
    expect(strip(container).getAttribute("aria-hidden")).toBe("true");
  });
});
