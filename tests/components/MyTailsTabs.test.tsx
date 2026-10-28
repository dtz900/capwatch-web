import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MyTailsTabs, type MyTailsTab } from "@/components/my-tails/MyTailsTabs";

const STABLE = { key: "stable" as const, label: "Stable", content: <div>STABLE PANEL</div> };
const BOARD = { key: "board" as const, label: "Market Masters", content: <div>BOARD PANEL</div> };
const VIP = { key: "vip" as const, label: "VIP", content: <div>VIP PANEL</div> };

function renderTabs(initialTab: MyTailsTab = "stable", three = false) {
  return render(
    <MyTailsTabs initialTab={initialTab} tabs={three ? [STABLE, BOARD, VIP] : [STABLE, BOARD]} />
  );
}

function swipeLeft(panel: HTMLElement) {
  fireEvent.touchStart(panel, { touches: [{ clientX: 220, clientY: 100 }] });
  fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 100, clientY: 108 }] });
}

function swipeRight(panel: HTMLElement) {
  fireEvent.touchStart(panel, { touches: [{ clientX: 100, clientY: 100 }] });
  fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 220, clientY: 108 }] });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("MyTailsTabs", () => {
  it("shows the stable panel by default and hides the board", () => {
    renderTabs();
    expect(screen.getByText("STABLE PANEL")).toBeInTheDocument();
    expect(screen.queryByText("BOARD PANEL")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Stable" })).toHaveAttribute("aria-selected", "true");
  });

  it("respects initialTab=board from the URL", () => {
    renderTabs("board");
    expect(screen.getByText("BOARD PANEL")).toBeInTheDocument();
    expect(screen.queryByText("STABLE PANEL")).not.toBeInTheDocument();
  });

  it("switches panels on tab click and mirrors the tab into the URL", () => {
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    renderTabs();
    fireEvent.click(screen.getByRole("tab", { name: "Market Masters" }));
    expect(screen.getByText("BOARD PANEL")).toBeInTheDocument();
    expect(screen.queryByText("STABLE PANEL")).not.toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith(null, "", "?tab=board");
  });

  it("returns to the stable with a bare pathname, not ?tab=stable", () => {
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    renderTabs("board");
    fireEvent.click(screen.getByRole("tab", { name: "Stable" }));
    expect(screen.getByText("STABLE PANEL")).toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith(null, "", window.location.pathname);
  });

  it("switches to the board on a horizontal left swipe", () => {
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    renderTabs();
    swipeLeft(screen.getByRole("tabpanel"));
    expect(screen.getByText("BOARD PANEL")).toBeInTheDocument();
  });

  it("ignores a mostly-vertical drag (scrolling)", () => {
    renderTabs();
    const panel = screen.getByRole("tabpanel");
    fireEvent.touchStart(panel, { touches: [{ clientX: 220, clientY: 100 }] });
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 140, clientY: 260 }] });
    expect(screen.getByText("STABLE PANEL")).toBeInTheDocument();
  });

  it("three tabs: clicking VIP mirrors ?tab=vip", () => {
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    renderTabs("stable", true);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    fireEvent.click(screen.getByRole("tab", { name: "VIP" }));
    expect(screen.getByText("VIP PANEL")).toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith(null, "", "?tab=vip");
  });

  it("three tabs: swipes walk the tab order and stop at the ends", () => {
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    renderTabs("stable", true);
    swipeRight(screen.getByRole("tabpanel"));
    expect(screen.getByText("STABLE PANEL")).toBeInTheDocument();
    swipeLeft(screen.getByRole("tabpanel"));
    expect(screen.getByText("BOARD PANEL")).toBeInTheDocument();
    swipeLeft(screen.getByRole("tabpanel"));
    expect(screen.getByText("VIP PANEL")).toBeInTheDocument();
    swipeLeft(screen.getByRole("tabpanel"));
    expect(screen.getByText("VIP PANEL")).toBeInTheDocument();
    swipeRight(screen.getByRole("tabpanel"));
    expect(screen.getByText("BOARD PANEL")).toBeInTheDocument();
  });

  it("stable + vip only: vip is the second tab and swipe reaches it", () => {
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    render(<MyTailsTabs initialTab="stable" tabs={[STABLE, VIP]} />);
    swipeLeft(screen.getByRole("tabpanel"));
    expect(screen.getByText("VIP PANEL")).toBeInTheDocument();
  });
});
