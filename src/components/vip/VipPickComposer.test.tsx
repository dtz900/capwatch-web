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

  it("composer maps 400 leg_missing_game", async () => {
    await postExpecting(
      new client.VipApiError(400, "leg_missing_game"),
      "Every leg needs a game from the list.",
    );
  });

  it("composer maps 422 to the bounds message", async () => {
    await postExpecting(
      new client.VipApiError(422, "Unprocessable Entity"),
      "Check units (0.1 to 10) and odds (100 to 10000 either side).",
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
});
