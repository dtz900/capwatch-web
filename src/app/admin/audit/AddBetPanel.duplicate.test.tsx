import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const add = vi.hoisted(() => vi.fn());
const searchGames = vi.hoisted(() => vi.fn());

vi.mock("./actions", () => ({
  addManualBetAction: add,
  searchPlayersAction: vi.fn(),
  searchGamesAction: searchGames,
}));

import { AddBetPanel } from "./AddBetPanel";

const DETAIL =
  "Already live as pick 9 ('Saint Joes +6.5' line 6.5 odds -110 units 1, posted 11-11 19:48 UTC, x.com/h/status/5). Price or stake differs: this one -112, 2u vs -110, 1u. May be a deliberate second bet.";
const refusal = { ok: false, error: `409: ${JSON.stringify({ detail: DETAIL })}` };

async function refusedForm() {
  searchGames.mockResolvedValue({
    ok: true,
    missingTeams: [],
    results: [{ game_pk: 1, away_team: "SJU", home_team: "VILL", game_date: "2026-11-12", commence_time: null }],
  });
  render(<AddBetPanel />);
  fireEvent.click(screen.getByText("+ Add bet manually"));
  fireEvent.change(screen.getByPlaceholderText("@capper handle"), { target: { value: "sexualslips" } });
  fireEvent.click(screen.getByText("List games"));
  fireEvent.click(await screen.findByText(/SJU @ VILL/, { selector: "button" }));
  fireEvent.change(screen.getByPlaceholderText(/selection text/), { target: { value: "Saint Joes +6.5" } });
  add.mockResolvedValueOnce(refusal);
  fireEvent.click(screen.getByRole("button", { name: "Add bet" }));
  await screen.findByRole("button", { name: "Enter anyway" });
}

describe("AddBetPanel duplicate refusal", () => {
  beforeEach(() => {
    add.mockReset();
    searchGames.mockReset();
  });

  it("shows the readable refusal and Enter anyway resends the current form with the override", async () => {
    await refusedForm();
    expect(screen.getByText(/Not added\. Already live as #9: Saint Joes \+6\.5, -110, 1u/)).toBeInTheDocument();
    expect(screen.queryByText(/409|detail/)).toBeNull();
    add.mockResolvedValueOnce({ ok: true, created_pick_ids: [5], parlay_id: null, capper_handle: "sexualslips" });
    fireEvent.click(screen.getByRole("button", { name: "Enter anyway" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(add.mock.calls[1][1]).toEqual({ allowDuplicate: true });
    expect(add.mock.calls[1][0].units).toBe(1);
  });

  it("changing any field drops the refusal, and the next send goes through the normal check", async () => {
    await refusedForm();
    fireEvent.change(screen.getByPlaceholderText("units"), { target: { value: "2" } });
    expect(screen.queryByRole("button", { name: "Enter anyway" })).toBeNull();
    add.mockResolvedValueOnce(refusal);
    fireEvent.click(screen.getByRole("button", { name: "Add bet" }));
    await screen.findByRole("button", { name: "Enter anyway" });
    expect(add).toHaveBeenCalledTimes(2);
    expect(add.mock.calls[1][1]).toBeUndefined();
    expect(add.mock.calls[1][0].units).toBe(2);
  });

  it("editing the form and restoring it does not bring the refusal back", async () => {
    await refusedForm();
    fireEvent.change(screen.getByPlaceholderText("units"), { target: { value: "2" } });
    fireEvent.change(screen.getByPlaceholderText("units"), { target: { value: "1" } });
    expect(screen.queryByRole("button", { name: "Enter anyway" })).toBeNull();
  });
});
