import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TofCardFace } from "./TofCardFace";
import type { DeckCard } from "./TofDeck";

vi.mock("@/components/slate/TeamLogo", () => ({ TeamLogo: ({ abbr }: { abbr: string }) => <span data-testid="logo">{abbr}</span> }));

function card(over: Partial<DeckCard>): DeckCard {
  return {
    kind: "shared", id: 1, position: 1, category: "cold", handle: "smsports34", display_name: null, profile_image_url: null,
    capper_streak: -3, capper_record: "12-7", sport: "MLB", matchup: "AZ @ COL", game_start_at: "2026-09-24T00:40:00Z",
    game_state: "scheduled", home_score: null, away_score: null, market_group: "Game Total", tail_label: "Over 11", tail_odds: -120,
    fade_label: "Under 11", fade_odds_at_deal: -108, fade_odds_source: "pinnacle_close", note: "3 straight losers.", rival: null,
    field_count: null, tail_outcome: null, fade_outcome: null, tail_units: null, fade_units: null, crowd: null,
    ...over,
  } as DeckCard;
}

describe("TofCardFace matchup", () => {
  it("shows the matchup next to the market under the pick on a totals card", () => {
    render(<TofCardFace card={card({})} />);
    const line = screen.getByTestId("pick-matchup");
    expect(line).toHaveTextContent("AZ @ COL");
    expect(line).toHaveTextContent("Game Total");
  });

  it("badges a total as O or U, not a truncated word", () => {
    render(<TofCardFace card={card({})} />);
    expect(screen.getByTestId("pick-badge")).toHaveTextContent(/^O$/);
    render(<TofCardFace card={card({ id: 2, tail_label: "Under 8.5", fade_label: "Over 8.5" })} />);
    expect(screen.getAllByTestId("pick-badge")[1]).toHaveTextContent(/^U$/);
  });

  it("shows the matchup on a moneyline card too", () => {
    render(<TofCardFace card={card({ market_group: "ML", tail_label: "AZ ML", fade_label: "COL ML" })} />);
    expect(screen.getByTestId("pick-matchup")).toHaveTextContent("AZ @ COL");
  });
});

describe("TofCardFace NCAAB", () => {
  const ncaab = (over: Partial<DeckCard> = {}) => card({
    sport: "NCAAB", matchup: "UNC @ DUKE", market_group: "Spread", tail_label: "DUKE -4.5", fade_label: "UNC +4.5",
    ...over,
  });

  it("shows the burgundy NCAAB chip and the school logo for the picked team", () => {
    render(<TofCardFace card={ncaab()} />);
    expect(screen.getByTestId("sport-chip")).toHaveTextContent("NCAAB");
    expect(screen.getByTestId("logo")).toHaveTextContent("DUKE");
  });

  it("has no NCAAB chip on a pro card", () => {
    render(<TofCardFace card={card({})} />);
    expect(screen.queryByTestId("sport-chip")).toBeNull();
  });

  it("labels a live college game by half and clock, and OT", () => {
    const live = { game_state: "in_progress" as const, home_score: 61, away_score: 58 };
    const { rerender } = render(<TofCardFace card={ncaab({ ...live, period: 2, clock: "4:12" })} />);
    expect(screen.getByTestId("live-label")).toHaveTextContent("2H 4:12");
    rerender(<TofCardFace card={ncaab({ ...live, period: 2, status_name: "STATUS_HALFTIME" })} />);
    expect(screen.getByTestId("live-label")).toHaveTextContent("HALF");
    rerender(<TofCardFace card={ncaab({ ...live, period: 3, clock: "1:05" })} />);
    expect(screen.getByTestId("live-label")).toHaveTextContent("OT 1:05");
    rerender(<TofCardFace card={ncaab({ ...live, game_state: "final" })} />);
    expect(screen.getByTestId("live-label")).toHaveTextContent("FINAL");
  });

  it("keeps plain LIVE for a baseball card", () => {
    render(<TofCardFace card={card({ game_state: "in_progress", home_score: 2, away_score: 1, period: 7 })} />);
    expect(screen.getByTestId("live-label")).toHaveTextContent("LIVE");
  });
});


describe("TofCardFace stable card", () => {
  const stable = (over: Partial<DeckCard>): DeckCard =>
    ({
      kind: "stable", id: -9, pick_id: 9, handle: "dai_bets", display_name: null, profile_image_url: null,
      matchup: "ARST @ ALA", game_start_at: "2026-11-07T00:30:00Z", market_group: "Spread",
      tail_label: "Arkansas State +25.5", tail_odds: -110, note: "From your stable.", capper_streak: 0,
      capper_record: null, sport: "NCAAB", ...over,
    }) as DeckCard;

  it("resolves a school name to its team logo and wears the NCAAB chip", () => {
    render(<TofCardFace card={stable({})} />);
    expect(screen.getByTestId("logo")).toHaveTextContent("ARST");
    expect(screen.getByTestId("sport-chip")).toHaveTextContent("NCAAB");
  });

  it("resolves an NBA mascot against the game's two teams", () => {
    render(<TofCardFace card={stable({ sport: "NBA", matchup: "WSH @ CLE", tail_label: "Wizards +10" })} />);
    expect(screen.getByTestId("logo")).toHaveTextContent("WSH");
  });

  it("keeps the O / U badge on a total", () => {
    render(<TofCardFace card={stable({ market_group: "Game Total", tail_label: "Over 150.5" })} />);
    expect(screen.getByTestId("pick-badge")).toHaveTextContent(/^O$/);
  });
});
