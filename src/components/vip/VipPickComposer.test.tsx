import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { VipMe } from "@/lib/vip/types";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));

const client = vi.hoisted(() => {
  class VipApiError extends Error {
    readonly status: number;
    readonly detail: string;
    constructor(status: number, detail: string) {
      super(`vip_${status}`);
      this.status = status;
      this.detail = detail;
    }
  }
  return { postVipPick: vi.fn(), searchVipGames: vi.fn(), VipApiError };
});
vi.mock("@/lib/vip/client", () => client);

import { VipPickComposer } from "./VipPickComposer";

const me: VipMe = {
  capper: { id: 7, handle: "moneyplayzz" },
  seller: { capper_id: 7, price_cents: 2500, founding: false, status: "active" },
  eligibility: [],
  can_post_sports: ["MLB", "NBA"],
};

const game = {
  game_pk: 7781,
  away_team: "NYY",
  home_team: "BOS",
  game_date: "2026-10-27",
  commence_time: "2026-10-27T23:05:00Z",
};

async function fillOneLeg() {
  fireEvent.click(screen.getByRole("button", { name: "List games" }));
  fireEvent.click(await screen.findByRole("button", { name: "NYY @ BOS" }));
  fireEvent.change(screen.getByPlaceholderText(/selection/i), { target: { value: "Yankees ML" } });
}

async function postExpecting(err: unknown, message: string) {
  client.postVipPick.mockRejectedValue(err);
  render(<VipPickComposer me={me} onPosted={() => {}} />);
  await fillOneLeg();
  fireEvent.click(screen.getByRole("button", { name: "Post VIP pick" }));
  expect(await screen.findByText(message)).toBeInTheDocument();
}

describe("VipPickComposer", () => {
  beforeEach(() => {
    auth.value = { session: { access_token: "tok" } };
    client.postVipPick.mockReset();
    client.searchVipGames.mockReset();
    client.searchVipGames.mockResolvedValue({ results: [game] });
  });

  it("composer limits sports to can_post_sports", () => {
    render(<VipPickComposer me={me} onPosted={() => {}} />);
    const select = screen.getByLabelText("Sport");
    const options = within(select)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual(["MLB", "NBA"]);
  });

  it("composer shows the eligibility message when no sport can post", () => {
    render(<VipPickComposer me={{ ...me, can_post_sports: [] }} onPosted={() => {}} />);
    expect(
      screen.getByText("You can post VIP picks once a sport is eligible."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Sport")).toBeNull();
  });

  it("composer maps 409 to game started", async () => {
    await postExpecting(new client.VipApiError(409, "game_started"), "That game has already started.");
  });

  it("composer maps 409 game_start_unknown", async () => {
    await postExpecting(
      new client.VipApiError(409, "game_start_unknown"),
      "We could not find a start time for that game. Pick it from the list.",
    );
  });

  it("composer maps 403 to not eligible", async () => {
    await postExpecting(
      new client.VipApiError(403, "sport_not_eligible"),
      "You are not eligible to post in this sport right now.",
    );
  });

  it("composer maps 400 unknown_stat_name", async () => {
    await postExpecting(
      new client.VipApiError(400, "unknown_stat_name"),
      "That market is not gradeable yet. Pick a standard market.",
    );
  });

  it("composer maps 400 selection_not_in_game", async () => {
    await postExpecting(
      new client.VipApiError(400, "selection_not_in_game"),
      "The selection must name one of the two teams in the game you picked.",
    );
  });

  it("composer maps 409 duplicate_pick", async () => {
    await postExpecting(
      new client.VipApiError(409, "duplicate_pick"),
      "You already posted this pick a few minutes ago.",
    );
  });

  it("composer maps 400 leg_missing_game", async () => {
    await postExpecting(
      new client.VipApiError(400, "leg_missing_game"),
      "Every leg needs a game from the list.",
    );
  });

  it("composer maps 422 to the bounds message", async () => {
    await postExpecting(
      new client.VipApiError(422, "Unprocessable Entity"),
      "Check units, odds, and lines: units 0.1 to 10, odds 100 to 10000 either side, lines as numbers.",
    );
  });

  it("composer maps anything else to the generic message", async () => {
    await postExpecting(new Error("network"), "Could not post the pick. Try again.");
  });

  it("composer posts, clears, and reports ids", async () => {
    client.postVipPick.mockResolvedValue({
      ok: true,
      created_pick_ids: [91],
      parlay_id: null,
      reveal_at: "2026-10-27T23:05:00Z",
    });
    const onPosted = vi.fn();
    render(<VipPickComposer me={me} onPosted={onPosted} />);
    await fillOneLeg();
    fireEvent.click(screen.getByRole("button", { name: "Post VIP pick" }));
    expect(
      await screen.findByText("Posted. Locked to subscribers until the game starts."),
    ).toBeInTheDocument();
    expect(onPosted).toHaveBeenCalledWith([91]);
    expect(client.postVipPick).toHaveBeenCalledWith(
      {
        sport: "MLB",
        units: 1,
        combined_odds: null,
        legs: [{ selection: "Yankees ML", game_id: "7781", odds: null, stat_name: "win" }],
      },
      "tok",
    );
    expect(screen.getByPlaceholderText(/selection/i)).toHaveValue("");
  });

  it("composer parlay: combined odds disables per-leg odds and nulls them", async () => {
    client.postVipPick.mockResolvedValue({
      ok: true,
      created_pick_ids: [91, 92],
      parlay_id: 5,
      reveal_at: "2026-10-27T23:05:00Z",
    });
    render(<VipPickComposer me={me} onPosted={() => {}} />);
    expect(screen.queryByLabelText("Combined odds")).toBeNull();
    await fillOneLeg();
    fireEvent.change(screen.getByLabelText("Leg 1 odds"), { target: { value: "-110" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add leg" }));
    fireEvent.click(screen.getByRole("button", { name: "NYY @ BOS" }));
    fireEvent.change(screen.getAllByPlaceholderText(/selection/i)[1], {
      target: { value: "Over 8.5" },
    });
    fireEvent.change(screen.getByLabelText("Combined odds"), { target: { value: "+260" } });
    expect(screen.getByLabelText("Leg 1 odds")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Post VIP pick" }));
    await screen.findByText("Posted. Locked to subscribers until the game starts.");
    const body = client.postVipPick.mock.calls[0][0];
    expect(body.combined_odds).toBe(260);
    expect(body.legs.map((l: { odds: number | null }) => l.odds)).toEqual([null, null]);
  });

  const BOUNDS = "Check units, odds, and lines: units 0.1 to 10, odds 100 to 10000 either side, lines as numbers.";

  async function twoLegParlay() {
    await fillOneLeg();
    fireEvent.click(screen.getByRole("button", { name: "+ Add leg" }));
    fireEvent.click(screen.getByRole("button", { name: "NYY @ BOS" }));
    fireEvent.change(screen.getAllByPlaceholderText(/selection/i)[1], {
      target: { value: "Yankees ML again" },
    });
  }

  it('"abc" in Combined odds keeps the button disabled', async () => {
    render(<VipPickComposer me={me} onPosted={() => {}} />);
    await twoLegParlay();
    const button = screen.getByRole("button", { name: "Post VIP pick" });
    expect(button).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Combined odds"), { target: { value: "abc" } });
    expect(button).toBeDisabled();
    expect(screen.getByText(BOUNDS)).toBeInTheDocument();
  });

  it("+50 leg odds keeps the button disabled", async () => {
    render(<VipPickComposer me={me} onPosted={() => {}} />);
    await fillOneLeg();
    const button = screen.getByRole("button", { name: "Post VIP pick" });
    fireEvent.change(screen.getByLabelText("Leg 1 odds"), { target: { value: "+50" } });
    expect(button).toBeDisabled();
    expect(screen.getByText(BOUNDS)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Leg 1 odds"), { target: { value: "-110.5" } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Leg 1 odds"), { target: { value: "+150" } });
    expect(button).toBeEnabled();
    expect(screen.queryByText(BOUNDS)).toBeNull();
  });

  it("units 10.5 keeps the button disabled", async () => {
    render(<VipPickComposer me={me} onPosted={() => {}} />);
    await fillOneLeg();
    const button = screen.getByRole("button", { name: "Post VIP pick" });
    const units = screen.getByLabelText("Units");
    expect(units).toHaveAttribute("step", "any");
    expect(units).not.toHaveAttribute("min");
    expect(units).not.toHaveAttribute("max");
    fireEvent.change(units, { target: { value: "10.5" } });
    expect(button).toBeDisabled();
    expect(screen.getByText(BOUNDS)).toBeInTheDocument();
    fireEvent.change(units, { target: { value: "1.1" } });
    expect(button).toBeEnabled();
  });

  it("composer requires direction and line for a total, and a numeric line", async () => {
    render(<VipPickComposer me={me} onPosted={() => {}} />);
    await fillOneLeg();
    const button = screen.getByRole("button", { name: "Post VIP pick" });
    fireEvent.change(screen.getByLabelText("Leg 1 market"), { target: { value: "total" } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Leg 1 direction"), { target: { value: "over" } });
    fireEvent.change(screen.getByLabelText("Leg 1 line"), { target: { value: "8.5x" } });
    expect(button).toBeDisabled();
    expect(screen.getByText(BOUNDS)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Leg 1 line"), { target: { value: "8.5" } });
    expect(button).toBeEnabled();
  });

  it("composer renders nothing without a session token", () => {
    auth.value = { session: null };
    const { container } = render(<VipPickComposer me={me} onPosted={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("composer clears game chips and team filter after a post", async () => {
    client.postVipPick.mockResolvedValue({
      ok: true,
      created_pick_ids: [91],
      parlay_id: null,
      reveal_at: "2026-10-27T23:05:00Z",
    });
    render(<VipPickComposer me={me} onPosted={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("team (optional)"), { target: { value: "NYY" } });
    await fillOneLeg();
    fireEvent.click(screen.getByRole("button", { name: "Post VIP pick" }));
    await screen.findByText("Posted. Locked to subscribers until the game starts.");
    expect(screen.queryByRole("button", { name: "NYY @ BOS" })).toBeNull();
    expect(screen.getByPlaceholderText("team (optional)")).toHaveValue("");
  });
});
