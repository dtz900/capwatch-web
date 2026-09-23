import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TofDeck, type DeckCard } from "@/components/tof/TofDeck";

const card = (id: number): DeckCard => ({
  kind: "shared", id, position: id, category: "heater", handle: "luckyluke", display_name: null,
  profile_image_url: null, capper_streak: 6, capper_record: "22-14 · +11.3u season", sport: "MLB",
  matchup: "NYY @ BAL", game_start_at: "2099-01-01T00:00:00Z", game_state: "scheduled", home_score: null,
  away_score: null, market_group: "Spread", tail_label: "NYY -1.5", tail_odds: 130, fade_label: "BAL +1.5",
  fade_odds_at_deal: -150, fade_odds_source: "pending", note: "Six straight winners.", rival: null,
  field_count: null, tail_outcome: null, fade_outcome: null, tail_units: null, fade_units: null, crowd: null,
});

describe("TofDeck", () => {
  it("renders the top card and calls onPlay with the button choice", async () => {
    const onPlay = vi.fn().mockResolvedValue(true);
    render(<TofDeck open={[card(1), card(2)]} locked={[]} onPlay={onPlay} />);
    expect(screen.getByText("NYY -1.5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^tail$/i }));
    await waitFor(() => expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), "tail"));
  });

  it("supports arrow keys on the focused deck", async () => {
    const onPlay = vi.fn().mockResolvedValue(true);
    render(<TofDeck open={[card(1)]} locked={[]} onPlay={onPlay} />);
    const deck = screen.getByTestId("tof-deck");
    fireEvent.keyDown(deck, { key: "ArrowLeft" });
    await waitFor(() => expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), "fade"));
  });

  it("shows locked cards face up without buttons when nothing is open", () => {
    render(<TofDeck open={[]} locked={[{ ...card(3), game_start_at: "2000-01-01T00:00:00Z" }]} onPlay={vi.fn()} />);
    expect(screen.getAllByText(/locked/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^tail$/i })).not.toBeInTheDocument();
  });

  it("disables fade on a stable card", () => {
    const stable: DeckCard = { kind: "stable", id: -555, pick_id: 555, handle: "picksoffice", display_name: null,
      profile_image_url: null, matchup: "CHC @ MIL", game_start_at: "2099-01-01T00:00:00Z", market_group: "Game Total",
      tail_label: "Under 8.5", tail_odds: -110, note: "From your stable.", capper_streak: 1, capper_record: null, sport: "MLB" };
    render(<TofDeck open={[stable]} locked={[]} onPlay={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^fade$/i })).toBeDisabled();
  });
});
