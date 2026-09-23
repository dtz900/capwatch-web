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
