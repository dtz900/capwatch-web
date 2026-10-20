import { describe, expect, it, vi } from "vitest";
import { buildNbaPanel } from "@/lib/nba-og-panel";
import type { RosterAthlete } from "@/lib/espn-nba-roster";
import type { SlateGame, SlatePick } from "@/lib/types";
import { fetchNbaHero, fitNbaChips, nbaCaptionLine, type NbaHeroDeps } from "./_nba-hero";

// BOS @ DET, 2026-10-20: the slate payload shape (trimmed), names only (NBA props carry no player_id yet).
const row = (o: Partial<SlatePick> & { capper_id: number }): SlatePick =>
  ({
    capper_rank: null,
    handle: `h${o.capper_id}`,
    display_name: null,
    profile_image_url: null,
    tier: null,
    has_paid_program: false,
    kind: "straight",
    leg_count: null,
    market: null,
    selection: null,
    line: null,
    odds_taken: null,
    stake_units: 1,
    posted_at: null,
    tweet_url: null,
    source: null,
    outcome: null,
    profit_units: null,
    player_id: null,
    ...o,
  }) as SlatePick;

const prop = (capper_id: number, player_name: string, selection: string, player_id: number | null = null) =>
  row({ capper_id, player_name, player_id, market: "player_prop", selection: `${player_name} ${selection}` });

const ml = [
  row({ capper_id: 1, market: "ml", selection: "Celtics ML", odds_taken: -130 }),
  row({ capper_id: 4, market: "ml", selection: "Pistons ML", odds_taken: 110 }),
];

const base: Omit<SlateGame, "picks"> = {
  game_id: 1,
  away_team: "BOS",
  home_team: "DET",
  away_starter: null,
  home_starter: null,
  game_date: "2026-10-20",
  game_time: null,
  game_state: "scheduled",
  away_score: null,
  home_score: null,
  inning: null,
  inning_half: null,
  outs: null,
  sport: "NBA",
};

const game: SlateGame = {
  ...base,
  picks: [
    ...ml,
    prop(1, "Cade Cunningham", "TO SCORE 20+ POINTS"),
    prop(2, "Cade Cunningham", "TO SCORE 20+ POINTS"),
    prop(3, "Cade Cunningham", "6+ AST"),
    prop(1, "Jayson Tatum", "TO SCORE 20+ POINTS"),
    prop(2, "Jayson Tatum", "OVER 8.5 Rebounds"),
    prop(5, "Jaylen Brown", "TO SCORE 20+ POINTS"),
  ],
};
const panel = buildNbaPanel(game);
const noProps: SlateGame = { ...base, picks: ml };

const ROSTER: RosterAthlete[] = [
  { id: 4432166, fullName: "Cade Cunningham", lastName: "Cunningham", team: "DET" },
  { id: 4065648, fullName: "Jayson Tatum", lastName: "Tatum", team: "BOS" },
  { id: 3917376, fullName: "Jaylen Brown", lastName: "Brown", team: "BOS" },
];
const byName = (name: string) => ROSTER.find((a) => a.fullName === name) ?? null;
const STILL = "https://a.espncdn.com/photo/2026/1020/r1_1296x729_16-9.jpg";

function makeDeps(stillFor: (id: number) => string | null = () => STILL) {
  const resolve = vi.fn(async (name: string) => byName(name));
  const actionUrl = vi.fn(async (id: number) => stillFor(id));
  const toDataUri = vi.fn(async (url: string | null) => (url ? `data:image/jpeg;base64,${url.length}` : null));
  const roster = vi.fn(async (abbr: string) => ROSTER.filter((a) => a.team === abbr));
  const deps: NbaHeroDeps = { resolve, actionUrl, toDataUri, roster };
  return { deps, resolve, actionUrl, toDataUri, roster };
}

describe("fetchNbaHero", () => {
  it("orders the fixture most-backed first", () => {
    expect(panel.players.map((p) => p.name)).toEqual(["Cade Cunningham", "Jayson Tatum", "Jaylen Brown"]);
  });

  it("tries the most-backed player, then the next two, before giving up", async () => {
    const { deps, actionUrl } = makeDeps((id) => (id === 3917376 ? STILL : null));
    const hero = await fetchNbaHero(game, panel, "action", deps);
    expect(hero?.player.name).toBe(panel.players[2].name);
    expect(hero?.photoKind).toBe("action");
    expect(hero?.athleteId).toBe(3917376);
    expect(hero?.teamSide).toBe("away");
    expect(actionUrl).toHaveBeenCalledTimes(3);
    expect(actionUrl).toHaveBeenCalledWith(4432166, "Cunningham", 2500, "NBA");
  });

  it("requests the still through the combiner at 1200x675", async () => {
    const { deps, toDataUri } = makeDeps();
    await fetchNbaHero(game, panel, "action", deps);
    expect(toDataUri).toHaveBeenCalledWith(
      "https://a.espncdn.com/combiner/i?img=/photo/2026/1020/r1_1296x729_16-9.jpg&w=1200&h=675",
    );
  });

  it("falls back to the first player's headshot when no still qualifies in action mode", async () => {
    const { deps, toDataUri } = makeDeps(() => null);
    const hero = await fetchNbaHero(game, panel, "action", deps);
    expect(hero?.photoKind).toBe("headshot");
    expect(hero?.player.name).toBe("Cade Cunningham");
    expect(hero?.teamSide).toBe("home");
    expect(toDataUri).toHaveBeenCalledWith("https://a.espncdn.com/i/headshots/nba/players/full/4432166.png");
  });

  it("headshot mode skips the article lookup", async () => {
    const { deps, actionUrl } = makeDeps();
    const hero = await fetchNbaHero(game, panel, "headshot", deps);
    expect(actionUrl).not.toHaveBeenCalled();
    expect(hero?.photoKind).toBe("headshot");
    expect(hero?.athleteId).toBe(4432166);
  });

  it("returns null past the deadline", async () => {
    const { deps } = makeDeps();
    const stalledDeps: NbaHeroDeps = { ...deps, resolve: () => new Promise(() => {}) };
    expect(await fetchNbaHero(game, panel, "action", stalledDeps, 50)).toBeNull();
  });

  it("returns null when the game has no props", async () => {
    const { deps, resolve } = makeDeps();
    expect(await fetchNbaHero(noProps, buildNbaPanel(noProps), "action", deps)).toBeNull();
    expect(resolve).not.toHaveBeenCalled();
  });

  it("returns null when no player resolves and no headshot loads", async () => {
    const { deps } = makeDeps();
    const lost: NbaHeroDeps = { ...deps, resolve: async () => null };
    expect(await fetchNbaHero(game, panel, "action", lost)).toBeNull();
  });

  it("trusts a stamped player_id only when it is on one of the two rosters", async () => {
    const stamped: SlateGame = {
      ...base,
      picks: [...ml, prop(1, "Cade Cunningham", "20+ PTS", 4432166), prop(2, "Cade Cunningham", "20+ PTS", 4432166)],
    };
    const { deps, resolve } = makeDeps();
    const hero = await fetchNbaHero(stamped, buildNbaPanel(stamped), "action", deps);
    expect(hero?.athleteId).toBe(4432166);
    expect(resolve).not.toHaveBeenCalled();

    const foreign: SlateGame = { ...stamped, picks: [...ml, prop(1, "Cade Cunningham", "20+ PTS", 999)] };
    const viaName = makeDeps();
    const hero2 = await fetchNbaHero(foreign, buildNbaPanel(foreign), "action", viaName.deps);
    expect(hero2?.athleteId).toBe(4432166);
    expect(viaName.resolve).toHaveBeenCalledWith("Cade Cunningham", ["BOS", "DET"]);
    expect(viaName.actionUrl).not.toHaveBeenCalledWith(999, expect.anything(), expect.anything(), expect.anything());
  });
});

describe("nbaCaptionLine", () => {
  it("prints cappers and the top bet when they fit", () => {
    expect(nbaCaptionLine("Cade Cunningham", 8, "20+ PTS")).toBe("8 CAPPERS · 20+ PTS");
    expect(nbaCaptionLine("Cade Cunningham", 1, null)).toBe("1 CAPPER");
  });

  it("drops the bet when name plus bet would pass 520px", () => {
    expect(nbaCaptionLine("Shai Gilgeous-Alexander", 12, "3+ PTS EACH QTR O/U 30.5")).toBe("12 CAPPERS");
    // Mono line at 0.6em + 1px tracking plus the plate's 60px chrome pushes this one past 520.
    expect(nbaCaptionLine("Giannis Antetokounmpo", 9, "o11.5 REB")).toBe("9 CAPPERS");
  });
});

describe("fitNbaChips", () => {
  it("keeps three short handles and the +N chip on one 470px row", () => {
    expect(fitNbaChips(["alpha", "bravo", "delta"], 37, 470)).toEqual({ handles: ["alpha", "bravo", "delta"], more: 37 });
  });

  it("folds handles that would overflow into +N", () => {
    expect(fitNbaChips(["bookitwithtrent", "blizzybets", "cdlocklounge"], 37, 470)).toEqual({
      handles: ["bookitwithtrent", "blizzybets"],
      more: 38,
    });
  });
});
