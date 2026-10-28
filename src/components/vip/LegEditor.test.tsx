import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { EMPTY_LEG, legToInput } from "@/lib/legDraft";

const client = vi.hoisted(() => ({ searchVipGames: vi.fn() }));
vi.mock("@/lib/vip/client", () => client);

import { LegEditor } from "./LegEditor";

describe("legDraft", () => {
  it("legEditor legToInput ml yields stat_name win", () => {
    const out = legToInput({
      ...EMPTY_LEG,
      type: "ml",
      selection: " Yankees ML ",
      odds: "-120",
      game: { game_pk: "401", away_team: "NYY", home_team: "BOS" },
    });
    expect(out).toEqual({ selection: "Yankees ML", game_id: "401", odds: -120, stat_name: "win" });
  });

  it("legToInput spread carries the line, nrfi defaults under 0.5", () => {
    expect(legToInput({ ...EMPTY_LEG, type: "spread", selection: "NYY -1.5", line: "-1.5" })).toEqual({
      selection: "NYY -1.5",
      game_id: null,
      odds: null,
      stat_name: "spread",
      line: -1.5,
    });
    expect(legToInput({ ...EMPTY_LEG, type: "nrfi", selection: "NRFI" })).toMatchObject({
      stat_name: "nrfi",
      direction: "under",
      line: 0.5,
    });
  });
});

describe("LegEditor", () => {
  function typeOptions(sport: "MLB" | "NFL" | "NBA") {
    render(<LegEditor sport={sport} legs={[{ ...EMPTY_LEG }]} onChange={() => {}} token="tok" />);
    const select = screen.getByLabelText("Leg 1 market");
    return within(select)
      .getAllByRole("option")
      .map((o) => o.textContent);
  }

  it("legEditor MLB shows run line and NRFI, no player prop", () => {
    expect(typeOptions("MLB")).toEqual([
      "Moneyline",
      "Run line",
      "Total",
      "Team total",
      "NRFI/YRFI",
      "Custom",
    ]);
  });

  it("legEditor NBA says Spread and hides NRFI", () => {
    expect(typeOptions("NBA")).toEqual(["Moneyline", "Spread", "Total", "Team total", "Custom"]);
  });

  it("legEditor assigns a listed game to the leg", async () => {
    client.searchVipGames.mockResolvedValue({
      results: [
        {
          game_pk: "401",
          away_team: "LAL",
          home_team: "BOS",
          game_date: "2026-10-27",
          commence_time: "2026-10-27T23:30:00Z",
        },
      ],
    });
    const onChange = vi.fn();
    render(<LegEditor sport="NBA" legs={[{ ...EMPTY_LEG }]} onChange={onChange} token="tok" />);
    fireEvent.change(screen.getByPlaceholderText("team (optional)"), { target: { value: "BOS" } });
    fireEvent.click(screen.getByRole("button", { name: "List games" }));
    fireEvent.click(await screen.findByRole("button", { name: "LAL @ BOS" }));
    expect(client.searchVipGames).toHaveBeenCalledWith(expect.any(String), "BOS", "NBA", "tok");
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ game: expect.objectContaining({ game_pk: "401" }) }),
    ]);
  });
});
