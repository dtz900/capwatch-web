import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { EMPTY_LEG, legToInput, parseLineField, parseOddsField } from "@/lib/legDraft";

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

  it("legToInput team_runs yields team_points for NBA and team_runs for MLB", () => {
    const leg = { ...EMPTY_LEG, type: "team_runs" as const, selection: "BOS over 112.5", direction: "over" as const, line: "112.5" };
    expect(legToInput(leg, "NBA")).toMatchObject({ stat_name: "team_points", direction: "over", line: 112.5 });
    expect(legToInput(leg, "NFL")).toMatchObject({ stat_name: "team_points" });
    expect(legToInput(leg, "MLB")).toMatchObject({ stat_name: "team_runs" });
    expect(legToInput(leg)).toMatchObject({ stat_name: "team_runs" });
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

describe("legDraft field parsers", () => {
  it("parseOddsField: empty null, integer number, else invalid", () => {
    expect(parseOddsField("  ")).toBeNull();
    expect(parseOddsField("+150")).toBe(150);
    expect(parseOddsField("-110")).toBe(-110);
    expect(parseOddsField("abc")).toBe("invalid");
    expect(parseOddsField("-110.5")).toBe("invalid");
  });

  it("parseLineField: empty null, finite number, else invalid", () => {
    expect(parseLineField("")).toBeNull();
    expect(parseLineField("-1.5")).toBe(-1.5);
    expect(parseLineField("8.5x")).toBe("invalid");
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

  it("legEditor disables + Add leg at 10 legs", () => {
    const onChange = vi.fn();
    const nine = Array.from({ length: 9 }, () => ({ ...EMPTY_LEG }));
    const { rerender } = render(<LegEditor sport="MLB" legs={nine} onChange={onChange} token="tok" />);
    expect(screen.getByRole("button", { name: "+ Add leg" })).toBeEnabled();
    expect(screen.queryByText("Max 10 legs")).toBeNull();
    rerender(<LegEditor sport="MLB" legs={[...nine, { ...EMPTY_LEG }]} onChange={onChange} token="tok" />);
    const add = screen.getByRole("button", { name: "+ Add leg" });
    expect(add).toBeDisabled();
    expect(screen.getByText("Max 10 legs")).toBeInTheDocument();
    fireEvent.click(add);
    expect(onChange).not.toHaveBeenCalled();
  });
});
