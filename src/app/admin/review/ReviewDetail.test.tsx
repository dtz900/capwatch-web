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
  it("reads No game bound for an unbound parlay leg", () => {
    render(<ReviewDetail {...props(row({ game_id: null, parlay_id: 5 }))} />);
    expect(screen.getByText("No game bound")).toBeInTheDocument();
    expect(screen.queryByText("Pregame")).toBeNull();
  });
  it("does not claim Pregame for a bound game without a start time", () => {
    render(<ReviewDetail {...props(row({ game_id: "1", tip_label: null }))} />);
    expect(screen.queryByText("Pregame")).toBeNull();
    expect(screen.getByText("Start time not loaded")).toBeInTheDocument();
  });
  it("reads Pregame for a bound game with a start time", () => {
    render(<ReviewDetail {...props(row({ game_id: "1", tip_label: "10:00 AM", game_label: "NE @ BUF" }))} />);
    expect(screen.getByText("Pregame")).toBeInTheDocument();
  });
  it("shows the label derived from the hint after a bind, not the raw id", () => {
    render(
      <ReviewDetail
        {...props(row({ game_id: "77123", game_label: null }), {
          hint: { game: { away_team: "Boston Celtics", home_team: "Miami Heat" } },
          markets: [],
        })}
      />,
    );
    expect(screen.queryByText("77123")).toBeNull();
    expect(screen.getAllByText(/Celtics|BOS|Boston/i).length).toBeGreaterThan(0);
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
  it("labels a needs_review sibling outside this view", () => {
    const cur = row({ pick_id: 1, raw_id: 9 });
    render(
      <ReviewDetail
        {...props(cur, {
          tracked: [{ id: 3, selection: "Evan Mobley 7+ rebounds", review_status: "needs_review", odds_taken: null, parlay_id: null }],
        })}
      />,
    );
    expect(screen.getByText("Held (not in this view)")).toBeInTheDocument();
  });
  it("marks the tweet line", () => {
    render(<ReviewDetail {...props(row({ selection: "Anthony Davis 8+ rebounds", tweet_text: "x\nAnthony Davis 8+ rebounds\ny" }))} />);
    expect(screen.getByText("Anthony Davis 8+ rebounds", { selector: "mark" })).toBeInTheDocument();
  });
  it("opens the Game editor by itself when the pick is unbound", () => {
    render(<ReviewDetail {...props(row({ game_id: null, parlay_id: null, posted_at: "2026-11-05T20:00:00Z" }), { markets: [] })} />);
    expect(screen.getByLabelText("Filter games by team")).toBeInTheDocument();
  });
  it("keeps the Game editor closed when a game is bound", () => {
    render(<ReviewDetail {...props(row({ game_id: "1", game_label: "NE @ BUF" }), { markets: [] })} />);
    expect(screen.queryByLabelText("Filter games by team")).toBeNull();
  });
});
