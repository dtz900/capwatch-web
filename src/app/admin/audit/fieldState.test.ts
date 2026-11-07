import { describe, expect, it } from "vitest";
import type { AuditProblem } from "@/lib/api";
import type { MarketDef } from "./actions";
import { fieldStates, isStrayNcaabProp, primaryLabel } from "./fieldState";

function problem(over: Partial<AuditProblem> = {}): AuditProblem {
  return {
    pick_id: 1,
    capper_id: 1,
    sport: "MLB",
    capper_handle: "x",
    capper_display_name: null,
    kind: "ungraded",
    reason: "no_grade_row",
    market: "strikeouts",
    selection: "over",
    line: 5.5,
    odds_taken: -110,
    units: 1,
    player_id: 42,
    game_id: "g1",
    game_date: null,
    parlay_id: null,
    posted_at: null,
    raw_id: null,
    tweet_text: null,
    tweet_url: null,
    bet_kind: "player",
    stat_name: "strikeouts",
    player_name: "Framber Valdez",
    ...over,
  };
}

const marketDef = (over: Partial<MarketDef> = {}): MarketDef => ({
  stat_name: "strikeouts",
  role_required: "pitcher",
  aliases: [],
  default_line: null,
  takes_line: false,
  ...over,
});

const reds = (p: AuditProblem) => fieldStates(p, null).filter((s) => s.red);
const get = (p: AuditProblem, key: string, m: MarketDef[] | null = null) =>
  fieldStates(p, m).find((s) => s.key === key);

describe("fieldStates reason table", () => {
  it("missing_game_id: only game red, Not bound", () => {
    const r = reds(problem({ reason: "missing_game_id", game_id: null }));
    expect(r.map((s) => s.key)).toEqual(["game"]);
    expect(r[0].note).toBe("Not bound");
  });
  it("missing_player_id: player red, None attached", () => {
    const r = reds(problem({ reason: "missing_player_id", player_id: null, player_name: null }));
    expect(r.map((s) => s.key)).toEqual(["player"]);
    expect(r[0].note).toBe("None attached");
  });
  it("missing_line: line red, No number in the tweet", () => {
    const r = reds(problem({ reason: "missing_line", line: null }));
    expect(r.map((s) => s.key)).toEqual(["line"]);
    expect(r[0].note).toBe("No number in the tweet");
  });
  it("market_unhandled names the parsed market", () => {
    const r = reds(problem({ reason: "market_unhandled", market: "spread_h1", stat_name: null }));
    expect(r.map((s) => s.key)).toEqual(["market"]);
    expect(r[0].note).toBe('Parsed as "spread_h1", which the grader does not know');
  });
  it("player_did_not_play: game red with the next-day note", () => {
    const r = reds(problem({ reason: "player_did_not_play" }));
    expect(r.map((s) => s.key)).toEqual(["game"]);
    expect(r[0].note).toBe(
      "Player was not in this game's box. Usually the tweet was for the next day.",
    );
  });
  it.each(["no_grade_row", "ungradeable", "data_gap", "game_pending"])(
    "%s alone: nothing red, Regrade enabled",
    (reason) => {
      const states = fieldStates(problem({ reason }), null);
      expect(states.some((s) => s.red)).toBe(false);
      expect(primaryLabel(states, false)).toEqual({
        label: "Regrade",
        enabled: true,
        remaining: 0,
      });
    },
  );
});

describe("fieldStates data rule", () => {
  it("null game_id turns game red even for a quiet reason", () => {
    expect(reds(problem({ game_id: null })).map((s) => s.key)).toEqual(["game"]);
  });
  it("player bet without player_id turns player red", () => {
    expect(reds(problem({ player_id: null, player_name: null })).map((s) => s.key)).toEqual([
      "player",
    ]);
  });
  it("null line is red unless the market takes none", () => {
    const p = problem({ line: null });
    expect(get(p, "line", [marketDef({ takes_line: false })])?.red).toBe(false);
    expect(get(p, "line", [marketDef({ takes_line: true })])?.red).toBe(true);
    expect(get(p, "line", null)?.red).toBe(true);
    expect(get(p, "line", [])?.red).toBe(true);
  });
  it("falls back to p.market when stat_name is absent", () => {
    const p = problem({ stat_name: null, market: "moneyline", line: null });
    expect(get(p, "line", [marketDef({ stat_name: "moneyline" })])?.red).toBe(false);
  });
});

describe("fieldStates shape", () => {
  it("orders fields and formats values", () => {
    const states = fieldStates(problem(), null);
    expect(states.map((s) => s.key)).toEqual([
      "player",
      "game",
      "market",
      "line",
      "odds",
      "stake",
    ]);
    expect(get(problem({ odds_taken: 223 }), "odds")?.value).toBe("+223");
    expect(get(problem(), "odds")?.value).toBe("-110");
    expect(get(problem({ units: 2 }), "stake")?.value).toBe("2u");
    expect(get(problem(), "player")?.value).toBe("Framber Valdez");
    expect(get(problem({ player_name: null }), "player")?.value).toBe("id 42");
  });
  it("missing odds and stake show Not stated without going red", () => {
    const p = problem({ odds_taken: null, units: null });
    for (const k of ["odds", "stake"]) {
      expect(get(p, k)).toMatchObject({ value: null, red: false, note: "Not stated" });
    }
  });
  it("NCAAB has no player entry", () => {
    const p = problem({ sport: "NCAAB", bet_kind: "game", player_id: null });
    expect(fieldStates(p, null).some((s) => s.key === "player")).toBe(false);
    const lower = problem({ sport: "ncaab", bet_kind: "player", player_id: null });
    expect(fieldStates(lower, null).some((s) => s.key === "player")).toBe(false);
  });
});

describe("isStrayNcaabProp", () => {
  it("true only for NCAAB player bets", () => {
    expect(isStrayNcaabProp(problem({ sport: "NCAAB", bet_kind: "player" }))).toBe(true);
    expect(isStrayNcaabProp(problem({ sport: "NCAAB", bet_kind: "game" }))).toBe(false);
    expect(isStrayNcaabProp(problem({ sport: "MLB", bet_kind: "player" }))).toBe(false);
  });
});

describe("primaryLabel", () => {
  it("blocks while red remains and honors fixed", () => {
    const states = fieldStates(problem({ reason: "missing_game_id", game_id: null }), null);
    expect(primaryLabel(states, false)).toEqual({ label: "Regrade", enabled: false, remaining: 1 });
    const fixed = states.map((s) => (s.key === "game" ? { ...s, fixed: true } : s));
    expect(primaryLabel(fixed, true)).toEqual({
      label: "Save and regrade",
      enabled: true,
      remaining: 0,
    });
  });
});

describe("fieldStates game label and markets error", () => {
  it("shows the label instead of the raw id", () => {
    const g = fieldStates(problem(), null, { gameLabel: "San Antonio Spurs @ Sacramento Kings" }).find((s) => s.key === "game");
    expect(g?.value).toBe("San Antonio Spurs @ Sacramento Kings");
  });
  it("falls back to the row game_label then the id", () => {
    const withRow = fieldStates({ ...problem(), game_label: "SA @ SAC" } as AuditProblem, null).find((s) => s.key === "game");
    expect(withRow?.value).toBe("SA @ SAC");
    expect(fieldStates(problem(), null).find((s) => s.key === "game")?.value).toBe("g1");
  });
  it("a failed markets load does not red the line", () => {
    const line = fieldStates(problem({ line: null, reason: "no_grade_row" }), null, { marketsError: true }).find(
      (s) => s.key === "line",
    );
    expect(line?.red).toBe(false);
    expect(line?.note).toBe("Markets unavailable");
  });
  it("missing_line is still red on a markets error", () => {
    const line = fieldStates(problem({ line: null, reason: "missing_line" }), null, { marketsError: true }).find(
      (s) => s.key === "line",
    );
    expect(line?.red).toBe(true);
  });
});
