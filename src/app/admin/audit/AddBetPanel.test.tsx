import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const searchPlayers = vi.hoisted(() => vi.fn());
const searchGames = vi.hoisted(() => vi.fn());

vi.mock("./actions", () => ({
  addManualBetAction: vi.fn(),
  searchPlayersAction: searchPlayers,
  searchGamesAction: searchGames,
}));

import { AddBetPanel } from "./AddBetPanel";

function openPanelWithPlayerLeg() {
  render(<AddBetPanel />);
  fireEvent.click(screen.getByText("+ Add bet manually"));
  const typeSelect = screen
    .getAllByRole("combobox")
    .find((el) => Array.from((el as HTMLSelectElement).options).some((o) => o.value === "player"));
  fireEvent.change(typeSelect!, { target: { value: "player" } });
}

describe("AddBetPanel lookup failures", () => {
  beforeEach(() => {
    searchPlayers.mockReset();
    searchGames.mockReset();
  });

  it("shows a failed player search instead of an empty list", async () => {
    searchPlayers.mockResolvedValue({ ok: false, error: "HTTP 502" });
    openPanelWithPlayerLeg();
    fireEvent.change(screen.getByPlaceholderText("search player"), { target: { value: "tatum" } });
    fireEvent.click(screen.getByText("Search"));
    expect(await screen.findByText(/Player search failed: HTTP 502/)).toBeInTheDocument();
  });

  it("names rosters that did not load", async () => {
    searchPlayers.mockResolvedValue({ ok: true, results: [], missingTeams: ["LAL", "BOS"] });
    openPanelWithPlayerLeg();
    fireEvent.change(screen.getByPlaceholderText("search player"), { target: { value: "tatum" } });
    fireEvent.click(screen.getByText("Search"));
    expect(await screen.findByText("Rosters for LAL, BOS did not load")).toBeInTheDocument();
  });

  it("shows a failed game search", async () => {
    searchGames.mockResolvedValue({ ok: false, error: "boom" });
    openPanelWithPlayerLeg();
    fireEvent.click(screen.getByText("List games"));
    await waitFor(() => expect(screen.getByText(/Game search failed: boom/)).toBeInTheDocument());
  });
});
