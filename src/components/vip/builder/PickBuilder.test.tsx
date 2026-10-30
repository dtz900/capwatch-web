import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BoardGame, BoardSide } from "@/lib/vip/types";

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
  return {
    getVipBoardSlate: vi.fn(),
    getVipBoardGame: vi.fn(),
    postVipPick: vi.fn(),
    fixVipPick: vi.fn(),
    pullVipPick: vi.fn(),
    searchVipGames: vi.fn(),
    VipApiError,
  };
});
vi.mock("@/lib/vip/client", () => client);

import { PickBuilder } from "./PickBuilder";

const START = new Date(Date.now() + 3 * 3600 * 1000).toISOString();

function side(key: string, label: string, short: string, price: number, quotes: Record<string, number>,
              leg: Partial<BoardSide["leg"]>): BoardSide {
  const best = Math.max(...Object.values(quotes), price);
  return {
    key, label, short, price, quotes, best, best_book: Object.keys(quotes)[0] ?? null,
    leg: { sport: "NBA", game_id: "g1", stat_name: "spread", selection: "CHA", line: 1, direction: null,
           player_id: null, player_name: null, ...leg },
  };
}

const SPREAD_A = side("g1:sp:a", "CHA +1.5", "+1.5", -110, { fanduel: -105, draftkings: -115 },
  { selection: "CHA", line: 1.5 });
const SPREAD_H = side("g1:sp:h", "WSH -1.5", "-1.5", -110, { fanduel: -115, draftkings: -105 },
  { selection: "WSH", line: -1.5 });
// Nobody but DraftKings hangs this total: FanDuel shows the market price.
const OVER = side("g1:to:o", "Over 220.5", "O 220.5", -110, { draftkings: -108 },
  { stat_name: "total", selection: "Over", line: 220.5, direction: "over" });
const UNDER = side("g1:to:u", "Under 220.5", "U 220.5", -110, { draftkings: -112 },
  { stat_name: "total", selection: "Under", line: 220.5, direction: "under" });

const BOARD: BoardGame = {
  sport: "NBA", game_id: "g1", away: "CHA", home: "WSH", commence_time: START, started: false, thin: false,
  periods: { Game: { spread: [SPREAD_A, SPREAD_H], total: [OVER, UNDER], ml: null, alt_spreads: [], alt_totals: [], team_totals: [] } },
  props: [{
    player: "LaMelo Ball", player_id: "4432816", team: "CHA", stat_name: "points", group: "Points",
    sides: null,
    alts: [side("g1:pr:lamelo:30", "30+ Points", "30+", 210, { fanduel: 210 },
      { stat_name: "points", selection: "LaMelo Ball", line: 29.5, direction: "over",
        player_id: "4432816", player_name: "LaMelo Ball" })],
  }],
};

function renderBuilder(eligible = ["NBA"]) {
  return render(<PickBuilder token="tok" eligibleSports={eligible} preferredBook="fanduel" />);
}

async function tapPrice(name: RegExp) {
  fireEvent.click(await screen.findByRole("button", { name }));
}

const priceInput = (label: string) => screen.getByLabelText(`Price for ${label}`) as HTMLInputElement;

async function postSpread() {
  renderBuilder();
  await tapPrice(/^\+1\.5/);
  fireEvent.click(screen.getByRole("button", { name: "Review pick" }));
  fireEvent.click(screen.getByRole("button", { name: "Post to subscribers" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  client.getVipBoardSlate.mockResolvedValue({ games: [BOARD] });
  client.getVipBoardGame.mockResolvedValue(BOARD);
});

describe("PickBuilder", () => {
  it("renders the board from the API and taps a price into the slip", async () => {
    renderBuilder();
    await tapPrice(/^\+1\.5/);
    expect(priceInput("CHA +1.5").value).toBe("-105");
    expect(client.getVipBoardGame).toHaveBeenCalledWith("NBA", "g1", "tok");
  });

  it("re-prices legs the capper has not typed over when the book changes", async () => {
    renderBuilder();
    await tapPrice(/^\+1\.5/);
    await tapPrice(/^-1\.5/);
    // Both sides of one spread can't ride together: the second tap replaced.
    expect(screen.queryByLabelText("Price for CHA +1.5")).toBeNull();
    fireEvent.change(priceInput("WSH -1.5"), { target: { value: "-120" } });
    await tapPrice(/^O 220\.5/);
    fireEvent.change(screen.getByLabelText("Your book"), { target: { value: "draftkings" } });
    expect(priceInput("WSH -1.5").value).toBe("-120");
    expect(priceInput("CHA/WSH Over 220.5").value).toBe("-108");
  });

  it("marks a rung the chosen book does not hang as the market price", async () => {
    renderBuilder();
    await tapPrice(/^O 220\.5/);
    expect(priceInput("CHA/WSH Over 220.5").value).toBe("-110");
    expect(screen.getByText(/Not at FanDuel, market price/)).toBeInTheDocument();
  });

  it("drops the leg and says so when the game has started", async () => {
    client.postVipPick.mockRejectedValue(new client.VipApiError(409, "game_started"));
    await postSpread();
    expect(await screen.findByText("This game has started.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Price for CHA +1.5")).toBeNull();
  });

  it("shows the best-book note on a clamped leg", async () => {
    client.postVipPick.mockResolvedValue({
      ok: true, created_pick_ids: [41], parlay_id: null, ticket_id: 41, reveal_at: START,
      fix_deadline: new Date(Date.now() + 600_000).toISOString(),
      clamped: [{ leg_index: null, posted: -105, recorded: -108, book: "fanduel" }],
    });
    await postSpread();
    expect(await screen.findByText("Sent to your subscribers")).toBeInTheDocument();
    expect(screen.getByText(/Your record counts it at -108/)).toBeInTheDocument();
    expect(client.postVipPick.mock.calls[0][0]).toMatchObject({
      sport: "NBA", units: 1, legs: [{ selection: "CHA", stat_name: "spread", line: 1.5, odds: -105, game_id: "g1" }],
    });
  });

  it("pulls with a two-tap confirm and lands on Pulled", async () => {
    client.postVipPick.mockResolvedValue({ ok: true, created_pick_ids: [41], parlay_id: null, ticket_id: 41, reveal_at: START });
    client.pullVipPick.mockResolvedValue(undefined);
    await postSpread();
    fireEvent.click(await screen.findByRole("button", { name: "Pull" }));
    fireEvent.click(screen.getByRole("button", { name: "Pull pick" }));
    expect(await screen.findByText("Pick pulled")).toBeInTheDocument();
    expect(client.pullVipPick).toHaveBeenCalledWith(41, "tok");
  });

  it("fixes through PATCH and shows the original", async () => {
    client.postVipPick.mockResolvedValue({ ok: true, created_pick_ids: [41], parlay_id: null, ticket_id: 41, reveal_at: START });
    client.fixVipPick.mockResolvedValue({ ok: true, created_pick_ids: [42], parlay_id: null, ticket_id: 42, reveal_at: START });
    await postSpread();
    fireEvent.click(await screen.findByRole("button", { name: /^Fix/ }));
    fireEvent.change(priceInput("CHA +1.5"), { target: { value: "-102" } });
    fireEvent.click(screen.getByRole("button", { name: "Review fix" }));
    fireEvent.click(screen.getByRole("button", { name: "Save fix" }));
    expect(await screen.findByText("Fix sent to your subscribers")).toBeInTheDocument();
    expect(client.fixVipPick.mock.calls[0][0]).toBe(41);
    expect(screen.getByText(/Original:/)).toBeInTheDocument();
  });

  it("gives an MLB-only seller the structured editor and no board", async () => {
    renderBuilder(["MLB"]);
    expect(screen.getByText("Build your pick")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List games" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Find a game")).toBeNull();
    expect(client.getVipBoardSlate).not.toHaveBeenCalled();
  });

  it("adds an off-board leg that posts the editor's fields", async () => {
    client.searchVipGames.mockResolvedValue({
      results: [{ game_pk: 7781, away_team: "NYY", home_team: "BOS", game_date: "2026-10-30", commence_time: START }],
    });
    client.postVipPick.mockResolvedValue({ ok: true, created_pick_ids: [9], parlay_id: null, ticket_id: 9, reveal_at: START });
    renderBuilder(["MLB"]);
    fireEvent.click(screen.getByRole("button", { name: "List games" }));
    fireEvent.click(await screen.findByRole("button", { name: "NYY @ BOS" }));
    fireEvent.change(screen.getByLabelText("Leg 1 selection"), { target: { value: "NYY" } });
    fireEvent.change(screen.getByLabelText("Leg 1 odds"), { target: { value: "+120" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to slip" }));
    const slipPrice = await screen.findByLabelText("Price for NYY");
    expect((slipPrice as HTMLInputElement).value).toBe("+120");
    fireEvent.click(screen.getByRole("button", { name: "Review pick" }));
    fireEvent.click(screen.getByRole("button", { name: "Post to subscribers" }));
    await waitFor(() => expect(client.postVipPick).toHaveBeenCalled());
    expect(client.postVipPick.mock.calls[0][0]).toMatchObject({
      sport: "MLB", legs: [{ selection: "NYY", game_id: "7781", stat_name: "win", odds: 120 }],
    });
    expect(await screen.findByText("Sent to your subscribers")).toBeInTheDocument();
  });
});


describe("PickBuilder review fixes", () => {
  it("names the player on a prop alt", async () => {
    renderBuilder();
    fireEvent.click(await screen.findByRole("button", { name: "Player props" }));
    await tapPrice(/^30\+/);
    expect(screen.getByLabelText("Price for LaMelo Ball 30+ Points")).toBeInTheDocument();
  });

  it("a fix can be abandoned, and a closed window returns to Pull", async () => {
    client.postVipPick.mockResolvedValue({ ok: true, created_pick_ids: [41], parlay_id: null, ticket_id: 41, reveal_at: START });
    client.fixVipPick.mockRejectedValue(new client.VipApiError(409, "fix_window_closed"));
    await postSpread();
    fireEvent.click(await screen.findByRole("button", { name: /^Fix/ }));
    fireEvent.click(screen.getByRole("button", { name: "Keep the posted pick" }));
    expect(await screen.findByRole("button", { name: "Pull" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Fix/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review fix" }));
    fireEvent.click(screen.getByRole("button", { name: "Save fix" }));
    expect(await screen.findByText(/fix window has closed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pull" })).toBeInTheDocument();
  });

  it("refuses a manual batch past the leg limit and keeps the drafts", async () => {
    client.searchVipGames.mockResolvedValue({
      results: [{ game_pk: 7781, away_team: "NYY", home_team: "BOS", game_date: "2026-10-30", commence_time: START }],
    });
    renderBuilder(["MLB"]);
    const addOne = async (n: number) => {
      fireEvent.click(screen.getByRole("button", { name: "List games" }));
      fireEvent.click(await screen.findByRole("button", { name: "NYY @ BOS" }));
      fireEvent.change(screen.getByLabelText("Leg 1 selection"), { target: { value: `Pick ${n}` } });
      fireEvent.change(screen.getByLabelText("Leg 1 odds"), { target: { value: "+120" } });
      fireEvent.click(screen.getByRole("button", { name: "Add to slip" }));
    };
    for (let n = 1; n <= 10; n++) await addOne(n);
    await addOne(11);
    expect(await screen.findByText(/holds up to 10 legs/)).toBeInTheDocument();
    expect(screen.getByLabelText("Leg 1 selection")).toHaveValue("Pick 11");
    expect(screen.queryByLabelText("Price for Pick 11")).toBeNull();
  });

  it("says so when a game's board fails to load", async () => {
    client.getVipBoardGame.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderBuilder();
    expect(await screen.findByText("Prices did not load. Refresh to try again.")).toBeInTheDocument();
  });

  it("follows a main book saved while it is open", async () => {
    const { rerender } = render(<PickBuilder token="tok" eligibleSports={["NBA"]} preferredBook="fanduel" />);
    await tapPrice(/^\+1\.5/);
    expect(priceInput("CHA +1.5").value).toBe("-105");
    rerender(<PickBuilder token="tok" eligibleSports={["NBA"]} preferredBook="draftkings" />);
    expect((screen.getByLabelText("Your book") as HTMLSelectElement).value).toBe("draftkings");
    expect(priceInput("CHA +1.5").value).toBe("-115");
  });

  it("posts a bet not on the board as the book wrote it", async () => {
    client.postVipPick.mockResolvedValue({ ok: true, created_pick_ids: [61], parlay_id: null, ticket_id: 61, reveal_at: START });
    renderBuilder();
    await screen.findByRole("button", { name: /^\+1\.5/ });
    fireEvent.click(screen.getByRole("button", { name: "Bet not on the board?" }));
    fireEvent.change(screen.getByLabelText("Bet as written"), { target: { value: "CHA 112-108 exact score" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "+2500" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to slip" }));
    expect(await screen.findByLabelText("Price for CHA 112-108 exact score")).toBeInTheDocument();
    expect(screen.getByText(/Checked before it counts/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review pick" }));
    fireEvent.click(screen.getByRole("button", { name: "Post to subscribers" }));
    await waitFor(() => expect(client.postVipPick).toHaveBeenCalled());
    expect(client.postVipPick.mock.calls[0][0].legs[0]).toEqual({
      selection: "CHA 112-108 exact score", game_id: "g1", offboard: true, odds: 2500,
    });
  });

  it("keeps the MLB editor for a seller eligible in MLB and NBA", async () => {
    renderBuilder(["NBA", "MLB"]);
    await screen.findByRole("button", { name: "Bet not on the board?" });
    fireEvent.click(screen.getByRole("button", { name: "MLB pick?" }));
    expect(screen.getByRole("button", { name: "List games" })).toBeInTheDocument();
  });
});
