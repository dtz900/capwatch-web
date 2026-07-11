import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MyTailsTabs } from "@/components/my-tails/MyTailsTabs";

function renderTabs(initialTab: "stable" | "board" = "stable") {
  return render(
    <MyTailsTabs
      initialTab={initialTab}
      stable={<div>STABLE PANEL</div>}
      board={<div>BOARD PANEL</div>}
    />
  );
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
    fireEvent.click(screen.getByRole("tab", { name: "Title Board" }));
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
    const panel = screen.getByRole("tabpanel");
    fireEvent.touchStart(panel, { touches: [{ clientX: 220, clientY: 100 }] });
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 100, clientY: 108 }] });
    expect(screen.getByText("BOARD PANEL")).toBeInTheDocument();
  });

  it("ignores a mostly-vertical drag (scrolling)", () => {
    renderTabs();
    const panel = screen.getByRole("tabpanel");
    fireEvent.touchStart(panel, { touches: [{ clientX: 220, clientY: 100 }] });
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 140, clientY: 260 }] });
    expect(screen.getByText("STABLE PANEL")).toBeInTheDocument();
  });
});
