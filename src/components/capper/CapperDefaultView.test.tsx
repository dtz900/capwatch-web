import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const filters = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const refresh = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());

vi.mock("./CapperFilterProvider", () => ({ useCapperFilters: () => filters.value }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/capperView", async (orig) => ({
  ...(await orig<typeof import("@/lib/capperView")>()),
  saveDefaultView: save,
}));

import { CapperDefaultView } from "./CapperDefaultView";

const base = {
  sport: "nba",
  window: "season",
  range: null,
  profile: { capper: { id: 7 } },
  capperView: false,
  defaultView: null,
};

describe("CapperDefaultView", () => {
  beforeEach(() => {
    refresh.mockReset();
    save.mockReset();
    auth.value = { session: { access_token: "tok" }, capper: null };
  });

  it("labels the capper's chosen view for everyone", () => {
    filters.value = { ...base, capperView: true, defaultView: { sport: "nba", window: "season" } };
    render(<CapperDefaultView />);
    expect(screen.getByText("Capper's view")).toBeInTheDocument();
  });

  it("shows nothing to a visitor on another view", () => {
    filters.value = base;
    const { container } = render(<CapperDefaultView />);
    expect(container).toBeEmptyDOMElement();
  });

  it("the owner saves the view on screen", async () => {
    filters.value = base;
    auth.value = { session: { access_token: "tok" }, capper: { id: 7, handle: "fadeai_" } };
    save.mockResolvedValue({ ok: true });
    render(<CapperDefaultView />);
    fireEvent.click(screen.getByRole("button", { name: "Show visitors this view first" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("tok", { sport: "nba", window: "season" }));
    // The tag shows at once, before the cached profile catches up.
    await waitFor(() => expect(screen.getByText("Capper's view")).toBeInTheDocument());
  });

  it("the owner sees what visitors land on until a view is saved", () => {
    filters.value = base;
    auth.value = { session: { access_token: "tok" }, capper: { id: 7, handle: "fadeai_" } };
    const { rerender } = render(<CapperDefaultView />);
    expect(screen.getByText(/Visitors land on All/)).toBeInTheDocument();
    filters.value = { ...base, sport: "all", defaultView: { sport: "nba", window: "season" } };
    rerender(<CapperDefaultView />);
    expect(screen.queryByText(/Visitors land on All/)).toBeNull();
    expect(screen.getByRole("button", { name: "Show visitors this view first" })).toBeInTheDocument();
  });

  it("no save control in date-range mode", () => {
    filters.value = { ...base, range: { start: "2026-10-01", end: "2026-10-31" } };
    auth.value = { session: { access_token: "tok" }, capper: { id: 7, handle: "fadeai_" } };
    const { container } = render(<CapperDefaultView />);
    expect(container).toBeEmptyDOMElement();
  });

  it("someone else's profile gets no save control", () => {
    filters.value = base;
    auth.value = { session: { access_token: "tok" }, capper: { id: 99, handle: "other" } };
    const { container } = render(<CapperDefaultView />);
    expect(container).toBeEmptyDOMElement();
  });
});
