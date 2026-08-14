import { describe, expect, it } from "vitest";
import { anonymizeStandings } from "@/lib/contentExclude";
import type { SlateCapperSummary } from "@/lib/types";

function row(overrides: Partial<SlateCapperSummary>): SlateCapperSummary {
  return {
    capper_id: 1,
    handle: "somecapper",
    display_name: "Some Capper",
    profile_image_url: "https://pbs.twimg.com/x.jpg",
    capper_rank: 5,
    wins: 4,
    losses: 1,
    pushes: 0,
    voids: 0,
    graded_count: 5,
    pending_count: 0,
    net_units: 3.2,
    current_day_streak: 2,
    ...overrides,
  } as SlateCapperSummary;
}

describe("anonymizeStandings (snapshot render)", () => {
  it("strips identity but keeps the math for excluded handles", () => {
    const [r] = anonymizeStandings([
      row({ capper_id: 83, handle: "winwhenhot", display_name: "$$$", net_units: 6.2 }),
    ]);
    expect(r.handle).toBeNull();
    expect(r.display_name).toBeNull();
    expect(r.profile_image_url).toBeNull();
    expect(r.current_day_streak).toBeNull();
    // The board stays true: rank inputs, record, and units untouched.
    expect(r.net_units).toBe(6.2);
    expect(r.wins).toBe(4);
    expect(r.capper_id).toBe(83);
  });

  it("matches case-insensitively", () => {
    const [r] = anonymizeStandings([row({ handle: "WinWhenHot" })]);
    expect(r.handle).toBeNull();
  });

  it("leaves every other capper untouched", () => {
    const input = row({ handle: "bigbuckbets" });
    const [r] = anonymizeStandings([input]);
    expect(r).toBe(input);
  });

  it("tolerates null handles and empty input", () => {
    expect(anonymizeStandings([row({ handle: null })])[0].display_name).toBe("Some Capper");
    expect(anonymizeStandings(null)).toEqual([]);
    expect(anonymizeStandings(undefined)).toEqual([]);
  });
});
