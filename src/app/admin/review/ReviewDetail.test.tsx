// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewDetail } from "./ReviewDetail";
import type { ReviewRow } from "./reviewRow";

vi.mock("../audit/actions", () => ({
  searchGamesAction: vi.fn(async () => ({ ok: true, results: [] })),
}));

function row(o: Partial<ReviewRow> = {}): ReviewRow {
  return {
    pick_id: 1,
    capper_id: 1,
    sport: "NBA",
    capper_handle: "cap",
    capper_display_name: "Cap",
    kind: "ungraded",
    reason: "",
    market: "player_rebounds",
    selection: "Anthony Davis 8+ rebounds",
    line: 8,
    odds_taken: -110,
    units: 1,
    player_id: null,
    game_id: "1",
    game_date: null,
    parlay_id: null,
    posted_at: null,
    raw_id: 9,
    tweet_text: "tweet",
    tweet_url: null,
    bet_kind: "player",
    stat_name: null,
    player_name: null,
    media_urls: [],
    review_reason: null,
    reason_label: "",
    reason_soft: true,
    started_minutes: null,
    posted_label: "9:00 AM",
    tip_label: null,
    game_label: null,
    player_team: null,
    game_teams: null,
    player_mismatch: null,
    raw_siblings: [],
    capper_profile_image_url: null,
    tweet_excerpt: "",
    ...o,
  } as ReviewRow;
}

function props(p: ReviewRow, o: Partial<React.ComponentProps<typeof ReviewDetail>> = {}) {
  return {
    p,
    index: 0,
    total: 1,
    markets: null,
    hint: undefined,
    pending: false,
    fixedKeys: [],
    onPatch: async () => {},
    onRetryMarkets: () => {},
    heldSiblings: [p],
    tracked: [],
    groupSelected: false,
    onApprove: () => {},
    onReject: () => {},
    onApproveAll: () => {},
    onRejectAll: () => {},
    onSelectGroup: () => {},
    ...o,
  };
}

describe("ReviewDetail", () => {
  it("shows the timing verdict", () => {
    render(<ReviewDetail {...props(row({ started_minutes: 42, game_label: "NE @ BUF", tip_label: "10:00 AM" }))} />);
    expect(screen.getByText("Started 42 min before the tweet")).toBeInTheDocument();
  });
  it("lists held siblings with their own buttons and the tracked ones greyed", () => {
    const cur = row({ pick_id: 1, raw_id: 9 });
    const sib = row({ pick_id: 2, raw_id: 9, selection: "Moussa Diabate 6+ rebounds" });
    render(
      <ReviewDetail
        {...props(cur, {
          heldSiblings: [cur, sib],
          tracked: [{ id: 3, selection: "Evan Mobley 7+ rebounds", review_status: "auto_approved", odds_taken: null, parlay_id: null }],
        })}
      />,
    );
    expect(screen.getByRole("button", { name: /approve all 2 held/i })).toBeInTheDocument();
    expect(screen.getByText("Tracked")).toBeInTheDocument();
  });
  it("marks the tweet line", () => {
    render(<ReviewDetail {...props(row({ selection: "Anthony Davis 8+ rebounds", tweet_text: "x\nAnthony Davis 8+ rebounds\ny" }))} />);
    expect(screen.getByText("Anthony Davis 8+ rebounds", { selector: "mark" })).toBeInTheDocument();
  });
});
