import { describe, it, expect } from "vitest";
import type { ReviewQueueItem } from "@/lib/api";
import { groupSizes, toReviewRow, type ReviewRow } from "./reviewRow";

const NOW = new Date("2026-11-07T03:00:00Z");

function item(overrides: Partial<ReviewQueueItem> = {}): ReviewQueueItem {
  return {
    id: 1,
    capper_id: 10,
    capper_handle: "capper",
    capper_display_name: "Capper",
    capper_profile_image_url: null,
    raw_id: 100,
    tweet_id: "t1",
    tweet_url: "https://x.com/capper/status/1",
    tweet_excerpt: "excerpt",
    review_reason: "pick_shaped_rescue",
    posted_at: "2026-11-06T22:07:33Z",
    parsed_at: null,
    parser_version: null,
    selection: "Trae Young 25+ points",
    line: 25,
    odds_taken: -110,
    units: 1,
    market: "player_prop",
    bet_kind: "player",
    stat_name: "points",
    player_name: "Trae Young",
    was_image_parsed: false,
    parlay_id: null,
    sport: "NBA",
    game_commence_time: "2026-11-07T00:00:00Z",
    game_label: "WSH @ ATL",
    game_started_minutes_before_post: null,
    tweet_text: "full tweet text",
    media_urls: [],
    player_team: null,
    game_teams: null,
    ...overrides,
  };
}

function row(overrides: Partial<ReviewRow> = {}): ReviewRow {
  return { ...toReviewRow(item(), [], NOW), ...overrides };
}

describe("toReviewRow", () => {
  it("maps a held NBA prop onto a queue row", () => {
    const r = toReviewRow(
      item({ id: 5, review_reason: null, player_team: "DAL", game_teams: { away: "WSH", home: "ATL" }, game_label: "WSH @ ATL" }),
      [],
      new Date("2026-11-07T03:00:00Z"),
    );
    expect(r.pick_id).toBe(5);
    expect(r.reason_label).toBe("No reason recorded");
    expect(r.player_mismatch).toBe("plays for DAL, not in WSH @ ATL. Wrong game?");
  });
  it("no mismatch when the team is in the game or unknown", () => {
    expect(toReviewRow(item({ player_team: "ATL", game_teams: { away: "WSH", home: "ATL" } }), [], NOW).player_mismatch).toBeNull();
    expect(toReviewRow(item({ player_team: null, game_teams: { away: "WSH", home: "ATL" } }), [], NOW).player_mismatch).toBeNull();
  });
  it("formats PT labels: today as time only", () => {
    const r = toReviewRow(item({ posted_at: "2026-11-06T22:07:33Z", game_commence_time: "2026-11-07T00:00:00Z" }), [], NOW);
    expect(r.posted_label).toBe("2:07 PM");
    expect(r.tip_label).toBe("4:00 PM");
  });
  it("formats PT labels: other days with month and day", () => {
    const r = toReviewRow(item({ posted_at: "2026-11-06T01:40:00Z" }), [], NOW);
    expect(r.posted_label).toBe("Nov 5, 5:40 PM");
  });
  it("fills the audit fields", () => {
    const r = toReviewRow(item({ review_reason: "x_y" }), [], NOW);
    expect(r.kind).toBe("ungraded");
    expect(r.reason).toBe("x_y");
    expect(r.game_date).toBeNull();
    expect(r.tweet_excerpt).toBe("excerpt");
  });
});

describe("groupSizes", () => {
  it("ignores null raw ids", () => {
    const m = groupSizes([row({ raw_id: 1 }), row({ raw_id: 1 }), row({ raw_id: null }), row({ raw_id: null })]);
    expect(m.get(1)).toBe(2);
    expect(m.size).toBe(1);
  });
});
