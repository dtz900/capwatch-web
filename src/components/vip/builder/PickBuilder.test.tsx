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
    postVipPicks: vi.fn(),
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

  it("a thin game never shows full-game prices under a period tab", async () => {
    const thin: BoardGame = { ...BOARD, game_id: "g2", thin: true };
    const full: BoardGame = {
      ...BOARD,
      periods: { ...BOARD.periods, "1H": { ...BOARD.periods.Game!, spread: null, total: null } },
    };
    client.getVipBoardSlate.mockResolvedValue({ games: [full, thin] });
    client.getVipBoardGame.mockImplementation(async (_s: string, id: string) => (id === "g2" ? thin : full));
    renderBuilder();
    await screen.findAllByRole("button", { name: /^\+1\.5/ });
    fireEvent.click(screen.getByRole("button", { name: "1st half" }));
    expect(screen.queryAllByRole("button", { name: /^\+1\.5/ })).toHaveLength(0);
    expect(screen.getByText("1st half lines open closer to game time.")).toBeInTheDocument();
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
    // No game until the capper picks one: a late board must not choose it for them.
    expect(screen.getByRole("button", { name: "Add to slip" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Game"), { target: { value: "NBA:g1" } });
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

  it("drops the off-board game choice when that game leaves the board", async () => {
    const LATER: BoardGame = { ...BOARD, game_id: "g2", away: "BOS", home: "NYK" };
    let startG1: (b: BoardGame) => void = () => {};
    client.getVipBoardSlate.mockResolvedValue({ games: [BOARD, LATER] });
    client.getVipBoardGame.mockImplementation((_sport: string, id: string) =>
      id === "g1" ? new Promise<BoardGame>((r) => { startG1 = r; }) : Promise.resolve(LATER));
    renderBuilder();
    fireEvent.click(await screen.findByRole("button", { name: "Bet not on the board?" }));
    fireEvent.change(screen.getByLabelText("Game"), { target: { value: "NBA:g1" } });
    fireEvent.change(screen.getByLabelText("Bet as written"), { target: { value: "CHA 112-108 exact score" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "+2500" } });
    expect(screen.getByRole("button", { name: "Add to slip" })).toBeEnabled();
    // g1's board lands already started: the draft must not slide onto g2.
    startG1({ ...BOARD, started: true });
    await waitFor(() => expect((screen.getByLabelText("Game") as HTMLSelectElement).value).toBe(""));
    expect(screen.getByRole("button", { name: "Add to slip" })).toBeDisabled();
    expect((screen.getByLabelText("Bet as written") as HTMLInputElement).value).toBe("CHA 112-108 exact score");
  });

  it("keeps the MLB editor for a seller eligible in MLB and NBA", async () => {
    renderBuilder(["NBA", "MLB"]);
    await screen.findByRole("button", { name: "Bet not on the board?" });
    fireEvent.click(screen.getByRole("button", { name: "MLB pick?" }));
    expect(screen.getByRole("button", { name: "List games" })).toBeInTheDocument();
  });
});


describe("PickBuilder straights mode", () => {
  const deadline = () => new Date(Date.now() + 600_000).toISOString();
  const batchResult = () => ({
    ok: true,
    tickets: [
      { ok: true, created_pick_ids: [51], parlay_id: null, ticket_id: 51, reveal_at: START, fix_deadline: deadline() },
      { ok: true, created_pick_ids: [52], parlay_id: null, ticket_id: 52, reveal_at: START, fix_deadline: deadline() },
    ],
  });

  async function twoLegs() {
    renderBuilder();
    await tapPrice(/^\+1\.5/);
    await tapPrice(/^O 220\.5/);
  }

  async function postStraights() {
    client.postVipPicks.mockResolvedValue(batchResult());
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.click(screen.getByRole("button", { name: "Review 2 picks" }));
    fireEvent.click(screen.getByRole("button", { name: "Post 2 picks to subscribers" }));
    await screen.findByText("2 picks sent to your subscribers");
  }

  it("offers the mode toggle only with two or more legs", async () => {
    renderBuilder();
    await tapPrice(/^\+1\.5/);
    expect(screen.queryByRole("button", { name: "Straights" })).toBeNull();
    await tapPrice(/^O 220\.5/);
    expect(screen.getByRole("button", { name: "Parlay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Straights" })).toBeInTheDocument();
  });

  it("switches the slip to per-pick totals and hides the parlay price", async () => {
    await twoLegs();
    // Two legs from one game read as a same game parlay until Straights.
    expect(screen.getByLabelText("Same game parlay price")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    expect(screen.getByText("STRAIGHTS · 2")).toBeInTheDocument();
    expect(screen.queryByText("Units each")).toBeNull();
    expect(screen.getByLabelText("Units for CHA +1.5")).toHaveValue("1");
    expect(screen.getByLabelText("Units for CHA/WSH Over 220.5")).toHaveValue("1");
    expect(screen.getByText("2 straights")).toBeInTheDocument();
    expect(screen.getByText(/Risk 2\.00u/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Same game parlay price")).toBeNull();
    expect(screen.queryByText("Parlay odds")).toBeNull();
    expect(screen.getByRole("button", { name: "Review 2 picks" })).toBeEnabled();
  });

  it("posts one single-leg ticket per leg in a single request", async () => {
    await postStraights();
    expect(client.postVipPicks).toHaveBeenCalledTimes(1);
    expect(client.postVipPick).not.toHaveBeenCalled();
    const [bodies, token] = client.postVipPicks.mock.calls[0];
    expect(token).toBe("tok");
    expect(bodies).toHaveLength(2);
    expect(bodies.every((b: { legs: unknown[]; combined_odds: unknown }) => b.legs.length === 1 && b.combined_odds === null)).toBe(true);
    expect(screen.getByText("One email went out with all of them.")).toBeInTheDocument();
  });

  it("pulls one straight without touching the other", async () => {
    client.pullVipPick.mockResolvedValue(undefined);
    await postStraights();
    fireEvent.click(screen.getAllByRole("button", { name: "Pull" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Pull pick" }));
    await waitFor(() => expect(client.pullVipPick).toHaveBeenCalledWith(52, "tok"));
    expect(await screen.findByText("PULLED")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Pull" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Fix/ })).toHaveLength(1);
  });

  it("fixes one straight alone and returns to the batch with the rest intact", async () => {
    client.fixVipPick.mockResolvedValue({
      ok: true, created_pick_ids: [53], parlay_id: null, ticket_id: 53, reveal_at: START, fix_deadline: deadline(),
    });
    await postStraights();
    fireEvent.click(screen.getAllByRole("button", { name: /^Fix/ })[0]);
    // One leg in the slip, and no mode toggle while fixing.
    expect(priceInput("CHA +1.5")).toBeInTheDocument();
    expect(screen.queryByLabelText("Price for CHA/WSH Over 220.5")).toBeNull();
    expect(screen.queryByRole("button", { name: "Straights" })).toBeNull();
    fireEvent.change(priceInput("CHA +1.5"), { target: { value: "-102" } });
    fireEvent.click(screen.getByRole("button", { name: "Review fix" }));
    fireEvent.click(screen.getByRole("button", { name: "Save fix" }));
    expect(await screen.findByText("2 picks sent to your subscribers")).toBeInTheDocument();
    expect(client.fixVipPick.mock.calls[0][0]).toBe(51);
    expect(client.postVipPick).not.toHaveBeenCalled();
    expect(screen.getByText("FIXED")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Fix/ })).toHaveLength(2);
  });

  it("a fix can be abandoned and the batch stands", async () => {
    await postStraights();
    fireEvent.click(screen.getAllByRole("button", { name: /^Fix/ })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Keep the posted pick" }));
    expect(await screen.findByText("2 picks sent to your subscribers")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Pull" })).toHaveLength(2);
  });

  it("Post another clears the batch and returns to Parlay", async () => {
    await postStraights();
    fireEvent.click(screen.getByRole("button", { name: "Post another" }));
    expect(screen.queryByText("2 picks sent to your subscribers")).toBeNull();
    await tapPrice(/^\+1\.5/);
    await tapPrice(/^O 220\.5/);
    expect(screen.getByText("SAME GAME PARLAY · 2")).toBeInTheDocument();
  });

  it("drops the started legs when the batch is refused", async () => {
    client.postVipPicks.mockRejectedValue(new client.VipApiError(409, "game_started"));
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.click(screen.getByRole("button", { name: "Review 2 picks" }));
    fireEvent.click(screen.getByRole("button", { name: "Post 2 picks to subscribers" }));
    expect(await screen.findByText("This game has started.")).toBeInTheDocument();
  });

  it("keeps Parlay mode on one post with the combined price", async () => {
    client.postVipPick.mockResolvedValue({ ok: true, created_pick_ids: [70], parlay_id: 3, ticket_id: 70, reveal_at: START });
    await twoLegs();
    fireEvent.change(screen.getByLabelText("Same game parlay price"), { target: { value: "+260" } });
    fireEvent.click(screen.getByRole("button", { name: "Review pick" }));
    fireEvent.click(screen.getByRole("button", { name: "Post to subscribers" }));
    expect(await screen.findByText("Sent to your subscribers")).toBeInTheDocument();
    expect(client.postVipPicks).not.toHaveBeenCalled();
    expect(client.postVipPick).toHaveBeenCalledTimes(1);
  });

  it("posts each straight at its own units and totals the risk", async () => {
    client.postVipPicks.mockResolvedValue(batchResult());
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.change(screen.getByLabelText("Units for CHA/WSH Over 220.5"), { target: { value: "2.5" } });
    expect(screen.getByText(/Risk 3\.50u/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review 2 picks" }));
    fireEvent.click(screen.getByRole("button", { name: "Post 2 picks to subscribers" }));
    await screen.findByText("2 picks sent to your subscribers");
    const bodies = client.postVipPicks.mock.calls[0][0];
    expect(bodies.map((b: { units: number }) => b.units)).toEqual([1, 2.5]);
    expect(screen.getByText("2.5u at FanDuel")).toBeInTheDocument();
  });

  it("one invalid units value blocks the review", async () => {
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.change(screen.getByLabelText("Units for CHA +1.5"), { target: { value: "11" } });
    expect(screen.getByRole("button", { name: "Review 2 picks" })).toBeDisabled();
    expect(screen.getByText("Units between 0.1 and 10 on every pick.")).toBeInTheDocument();
  });

  it("a leg added in Straights takes the last leg's units, and Parlay keeps one stepper", async () => {
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.change(screen.getByLabelText("Units for CHA/WSH Over 220.5"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Player props" }));
    await tapPrice(/^30\+/);
    expect(screen.getByLabelText("Units for LaMelo Ball 30+ Points")).toHaveValue("3");
    fireEvent.click(screen.getByRole("button", { name: "Parlay" }));
    expect(screen.queryByLabelText("Units for CHA +1.5")).toBeNull();
    expect(screen.getAllByLabelText("Units")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    expect(screen.getByLabelText("Units for CHA/WSH Over 220.5")).toHaveValue("3");
  });

  it("a straight left alone keeps its units, and posts them", async () => {
    client.postVipPick.mockResolvedValue({ ok: true, created_pick_ids: [80], parlay_id: null, ticket_id: 80, reveal_at: START });
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.change(screen.getByLabelText("Units for CHA +1.5"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove CHA/WSH Over 220.5" }));
    expect(screen.getByLabelText("Units")).toHaveValue("3");
    fireEvent.click(screen.getByRole("button", { name: "Review pick" }));
    fireEvent.click(screen.getByRole("button", { name: "Post to subscribers" }));
    await waitFor(() => expect(client.postVipPick).toHaveBeenCalled());
    expect(client.postVipPick.mock.calls[0][0].units).toBe(3);
  });

  it("the shared units seed both legs when a one-leg slip grows back", async () => {
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove CHA/WSH Over 220.5" }));
    fireEvent.change(screen.getByLabelText("Units"), { target: { value: "3" } });
    await tapPrice(/^O 220\.5/);
    expect(screen.getByLabelText("Units for CHA +1.5")).toHaveValue("3");
    expect(screen.getByLabelText("Units for CHA/WSH Over 220.5")).toHaveValue("3");
  });

  it("keeps the surviving leg's units when a started game is dropped", async () => {
    const G2_START = new Date(Date.parse(START) + 10 * 60 * 1000).toISOString();
    const spread2 = side("g2:sp:a", "BOS +3.5", "+3.5", -110, { fanduel: -105 },
      { game_id: "g2", selection: "BOS", line: 3.5 });
    const spread2h = side("g2:sp:h", "NYK -3.5", "-3.5", -110, { fanduel: -115 },
      { game_id: "g2", selection: "NYK", line: -3.5 });
    const BOARD2: BoardGame = {
      ...BOARD, game_id: "g2", away: "BOS", home: "NYK", commence_time: G2_START,
      periods: { Game: { ...BOARD.periods.Game!, spread: [spread2, spread2h], total: null } }, props: [],
    };
    client.getVipBoardSlate.mockResolvedValue({ games: [BOARD, BOARD2] });
    client.getVipBoardGame.mockImplementation(async (_s: string, id: string) => (id === "g2" ? BOARD2 : BOARD));
    client.postVipPicks.mockRejectedValue(new client.VipApiError(409, "game_started"));
    renderBuilder();
    await tapPrice(/^\+1\.5/);
    await tapPrice(/^\+3\.5/);
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.change(screen.getByLabelText("Units for BOS +3.5"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Review 2 picks" }));
    fireEvent.click(screen.getByRole("button", { name: "Post 2 picks to subscribers" }));
    expect(await screen.findByText("This game has started.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Price for CHA +1.5")).toBeNull();
    expect(screen.getByLabelText("Units")).toHaveValue("3");
  });

  it("says nothing was sent when the batch has a duplicate", async () => {
    client.postVipPicks.mockRejectedValue(new client.VipApiError(409, "duplicate_pick"));
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.click(screen.getByRole("button", { name: "Review 2 picks" }));
    fireEvent.click(screen.getByRole("button", { name: "Post 2 picks to subscribers" }));
    expect(await screen.findByText(/Nothing was sent\./)).toBeInTheDocument();
  });

  it("does not invite a retry when the batch answer does not match", async () => {
    client.postVipPicks.mockResolvedValue({ ok: true, tickets: [] });
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.click(screen.getByRole("button", { name: "Review 2 picks" }));
    fireEvent.click(screen.getByRole("button", { name: "Post 2 picks to subscribers" }));
    expect(await screen.findByText(/may have posted/)).toBeInTheDocument();
    expect(screen.queryByText(/Try again/)).toBeNull();
  });

  it("Clear returns the slip to Parlay", async () => {
    await twoLegs();
    fireEvent.click(screen.getByRole("button", { name: "Straights" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await tapPrice(/^\+1\.5/);
    await tapPrice(/^O 220\.5/);
    expect(screen.getByText("SAME GAME PARLAY · 2")).toBeInTheDocument();
  });

  it("shows NCAAB as locked while the platform reports sport_locked, never selectable", async () => {
    render(<PickBuilder token="tok" eligibleSports={["NBA", "NCAAB"]} lockedSports={["NCAAB"]} preferredBook="fanduel" />);
    await tapPrice(/^\+1\.5/);
    const locked = screen.getByTestId("vip-locked-NCAAB");
    expect(locked).toHaveTextContent("NCAAB VIP coming soon");
    expect(locked.tagName).not.toBe("BUTTON");
    expect(screen.queryByLabelText("Game date")).toBeNull();
    expect(client.getVipBoardSlate).not.toHaveBeenCalledWith("NCAAB", expect.anything());
  });

  it("drops the coming soon tile once nothing is reported locked", async () => {
    render(<PickBuilder token="tok" eligibleSports={["NBA", "NCAAB"]} lockedSports={[]} preferredBook="fanduel" />);
    await tapPrice(/^\+1\.5/);
    expect(screen.queryByTestId("vip-locked-NCAAB")).toBeNull();
    expect(screen.getByLabelText("Game date")).toBeInTheDocument();
  });

  it("explains a 403 sport_locked from the platform", async () => {
    client.postVipPick.mockRejectedValue(new client.VipApiError(403, "sport_locked"));
    await postSpread();
    expect(await screen.findByText("NCAAB VIP is coming soon.")).toBeInTheDocument();
  });
});

describe("PickBuilder NCAAB", () => {
  const NC_SIDE_A = side("n1:sp:a", "Auburn -3.5", "-3.5", -110, { fanduel: -110 },
    { sport: "NCAAB", game_id: "n1", selection: "Auburn", line: -3.5 });
  const NC_SIDE_H = side("n1:sp:h", "Miami (OH) +3.5", "+3.5", -110, { fanduel: -110 },
    { sport: "NCAAB", game_id: "n1", selection: "Miami (OH)", line: 3.5 });
  const NC_BOARD: BoardGame = {
    sport: "NCAAB", game_id: "n1", away: "Miami (OH)", home: "Auburn", commence_time: START, started: false,
    thin: false, home_id: "2", away_id: "193", books: ["fanduel"], no_lines: false, neutral_site: false,
    periods: { Game: { spread: [NC_SIDE_H, NC_SIDE_A], total: null, ml: null, alt_spreads: [], alt_totals: [], team_totals: [] } },
    props: [],
  };
  const RESULT = {
    game_pk: "n1", away_team: "M-OH", home_team: "AUB", away_name: "Miami (OH)", home_name: "Auburn",
    game_date: "2026-11-06", commence_time: START,
  };

  beforeEach(() => {
    client.getVipBoardSlate.mockResolvedValue({ games: [] });
    client.searchVipGames.mockResolvedValue({ results: [RESULT], truncated: true });
    client.getVipBoardGame.mockResolvedValue(NC_BOARD);
  });

  const renderNc = () => render(<PickBuilder token="tok" eligibleSports={["NCAAB"]} lockedSports={[]} preferredBook="fanduel" />);

  async function openGame() {
    renderNc();
    fireEvent.click(await screen.findByRole("button", { name: "Find games" }));
    fireEvent.click(await screen.findByRole("button", { name: /Miami \(OH\) at Auburn/ }));
  }

  it("lists both school names and says when results were cut off", async () => {
    renderNc();
    fireEvent.click(await screen.findByRole("button", { name: "Find games" }));
    expect(await screen.findByText("Miami (OH) at Auburn")).toBeInTheDocument();
    expect(screen.getByText(/Type a school to narrow/)).toBeInTheDocument();
    expect(client.searchVipGames).toHaveBeenCalledWith(expect.any(String), "", "NCAAB", "tok");
  });

  it("opens the board for the chosen game", async () => {
    await openGame();
    expect(client.getVipBoardGame).toHaveBeenCalledWith("NCAAB", "n1", "tok");
    expect(await screen.findByRole("button", { name: /^-3\.5/ })).toBeInTheDocument();
  });

  it("says no lines are posted yet", async () => {
    client.getVipBoardGame.mockResolvedValue({ ...NC_BOARD, no_lines: true, periods: {} });
    await openGame();
    expect(await screen.findByText(/No lines posted yet/)).toBeInTheDocument();
  });

  it("explains a rate limit with the platform message", async () => {
    client.getVipBoardGame.mockRejectedValue(new client.VipApiError(429, "board_rate_limited"));
    await openGame();
    expect(await screen.findByText(/opened a lot of college games/)).toBeInTheDocument();
  });

  it("explains an unavailable board", async () => {
    client.getVipBoardGame.mockRejectedValue(new client.VipApiError(502, "board_unavailable"));
    await openGame();
    expect(await screen.findByText(/not available right now/)).toBeInTheDocument();
  });

  it("tells the seller a leg was saved for review", async () => {
    client.postVipPick.mockResolvedValue({
      ok: true, created_pick_ids: [9], parlay_id: null, ticket_id: 9, reveal_at: START, unchecked: [0],
    });
    await openGame();
    fireEvent.click(await screen.findByRole("button", { name: /^-3\.5/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review pick" }));
    fireEvent.click(screen.getByRole("button", { name: "Post to subscribers" }));
    expect(await screen.findByText("We could not verify this price; it will be reviewed.")).toBeInTheDocument();
  });
});

