import { afterEach, describe, expect, it, vi } from "vitest";
import {
  espnNbaRosterUrl,
  fetchNbaRoster,
  matchRosterAthlete,
  normalizePersonName,
  resolveNbaAthlete,
  type RosterAthlete,
} from "./espn-nba-roster";

const R: RosterAthlete[] = [
  { id: 4065648, fullName: "Jayson Tatum", lastName: "Tatum", team: "BOS" },
  { id: 4432166, fullName: "Cade Cunningham", lastName: "Cunningham", team: "DET" },
  { id: 3945274, fullName: "Luka Dončić", lastName: "Dončić", team: "LAL" },
  { id: 1, fullName: "Jaylen Brown", lastName: "Brown", team: "PHI" },
  { id: 2, fullName: "Bruce Brown", lastName: "Brown", team: "NO" },
  { id: 3, fullName: "Kelly Oubre Jr.", lastName: "Oubre Jr.", team: "IND" },
];

describe("matchRosterAthlete", () => {
  it("matches a full name", () => expect(matchRosterAthlete(R, "Jayson Tatum")?.id).toBe(4065648));
  it("matches an accented name typed plain and an initial form", () => {
    expect(matchRosterAthlete(R, "Luka Doncic")?.id).toBe(3945274);
    expect(matchRosterAthlete(R, "L. Dončić")?.id).toBe(3945274);
    expect(matchRosterAthlete(R, "L Doncic")?.id).toBe(3945274);
  });
  it("matches a unique surname and refuses an ambiguous one", () => {
    expect(matchRosterAthlete(R, "Cunningham")?.id).toBe(4432166);
    expect(matchRosterAthlete(R, "Brown")).toBeNull();
    expect(matchRosterAthlete(R, "J. Brown")?.id).toBe(1);
  });
  it("ignores suffixes", () => expect(matchRosterAthlete(R, "Kelly Oubre")?.id).toBe(3));
  it("returns null for unknown names", () => expect(matchRosterAthlete(R, "Nobody Here")).toBeNull());
  it("normalizes names", () => expect(normalizePersonName("Kelly Oubre Jr.")).toBe("kelly oubre"));
});

describe("espnNbaRosterUrl", () => {
  it("builds the web host roster url", () => {
    expect(espnNbaRosterUrl("BOS")).toBe("https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/2/roster");
    expect(espnNbaRosterUrl("XXX")).toBeNull();
  });
});

describe("fetchNbaRoster", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("coerces string ids, caches success, never caches failure", async () => {
    const ok = { ok: true, json: async () => ({ athletes: [{ id: "99", fullName: "Test Guy", lastName: "Guy" }] }) };
    const f = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue(ok);
    vi.stubGlobal("fetch", f);
    expect(await fetchNbaRoster("MIA")).toEqual([]);
    const a = await fetchNbaRoster("MIA");
    expect(a).toEqual([{ id: 99, fullName: "Test Guy", lastName: "Guy", team: "MIA" }]);
    await fetchNbaRoster("MIA");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("returns [] on a thrown fetch and for unknown abbrs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    expect(await fetchNbaRoster("ORL")).toEqual([]);
    expect(await fetchNbaRoster("XXX")).toEqual([]);
  });
});

describe("resolveNbaAthlete", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("searches both team rosters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => ({
          athletes: url.includes("/teams/25/")
            ? [{ id: "7", fullName: "Shai Gilgeous-Alexander", lastName: "Gilgeous-Alexander" }]
            : [{ id: "8", fullName: "Other Guy", lastName: "Guy" }],
        }),
      })),
    );
    const hit = await resolveNbaAthlete("Shai Gilgeous-Alexander", ["OKC", "POR"]);
    expect(hit?.id).toBe(7);
    expect(await resolveNbaAthlete("x", [null, null])).toBeNull();
  });
});
