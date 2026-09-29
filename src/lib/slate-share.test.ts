import { describe, it, expect } from "vitest";
import { slateGameShareLink } from "./slate-share";

const game = (game_id: number, away_team: string | null, home_team: string | null) => ({
  game_id,
  away_team,
  home_team,
});
const PHI_ATL = game(824001, "PHI", "ATL");
const mlbToday = { sport: "mlb" as const, dateParam: "today" as const, week: undefined };

describe("slateGameShareLink", () => {
  it("features the matchup by its readable slug and anchors to the card", () => {
    const link = slateGameShareLink(PHI_ATL, [PHI_ATL, game(824002, "NYY", "BOS")], mlbToday);
    expect(link.queryParams.game).toBe("PHI-ATL");
    expect(link.hash).toBe("game-824001");
  });
  it("uses the game id when the matchup plays twice (doubleheader)", () => {
    const g2 = game(824009, "PHI", "ATL");
    const link = slateGameShareLink(g2, [PHI_ATL, g2], mlbToday);
    expect(link.queryParams.game).toBe("824009");
  });
  it("uses the game id when a team abbreviation is missing", () => {
    const tbd = game(824010, null, "ATL");
    expect(slateGameShareLink(tbd, [tbd], mlbToday).queryParams.game).toBe("824010");
  });
  it("keeps today's MLB link clean and marks tomorrow", () => {
    const today = slateGameShareLink(PHI_ATL, [PHI_ATL], mlbToday).queryParams;
    expect(today.date).toBeUndefined();
    expect(today.sport).toBeUndefined();
    const tomorrow = slateGameShareLink(PHI_ATL, [PHI_ATL], { ...mlbToday, dateParam: "tomorrow" });
    expect(tomorrow.queryParams.date).toBe("tomorrow");
  });
  it("pins an NFL link to its week so it still opens that board next week", () => {
    const kc = game(401772001, "KC", "BUF");
    const link = slateGameShareLink(kc, [kc], { sport: "nfl", dateParam: "today", week: 4 });
    expect(link.queryParams.sport).toBe("nfl");
    expect(link.queryParams.week).toBe("4");
    expect(link.queryParams.date).toBeUndefined();
  });
});
