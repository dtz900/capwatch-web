import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveEntryBadge } from "./LiveEntryBadge";
import { SlatePickRow } from "@/components/slate/SlatePickRow";
import { VersusPickRow } from "@/components/slate/VersusPickRow";
import { PendingBlock } from "@/components/capper/PendingBlock";
import { HistoryRow } from "@/components/capper/HistoryRow";
import type { HistoryPick, SlatePick } from "@/lib/types";

const slatePick: SlatePick = {
  capper_id: 1,
  capper_rank: 12,
  handle: "somecapper",
  display_name: null,
  profile_image_url: null,
  tier: null,
  has_paid_program: false,
  kind: "straight",
  leg_count: null,
  market: "ML",
  selection: "Yankees ML",
  line: null,
  odds_taken: 150,
  stake_units: 1,
  posted_at: null,
  tweet_url: null,
  source: "scraped",
  outcome: null,
  profit_units: null,
};

const historyPick: HistoryPick = {
  id: 1,
  kind: "straight",
  parlay_id: null,
  game_label: "BOS @ NYY",
  game_date: "2026-08-01",
  market: "ML",
  selection: "Yankees ML",
  line: null,
  odds_taken: 150,
  grading_odds: null,
  grading_odds_source: "posted",
  units: 1,
  outcome: null,
  profit_units: null,
  posted_at: null,
  tweet_url: null,
  source: null,
};

describe("LiveEntryBadge", () => {
  it("says LIVE and explains why CLV does not apply", () => {
    render(<LiveEntryBadge />);
    const badge = screen.getByText("Live");
    expect(badge.getAttribute("title")).toMatch(/after the game started/i);
    expect(badge.getAttribute("title")).toMatch(/CLV/);
    expect(badge.getAttribute("title")).not.toContain(String.fromCharCode(0x2014));
    expect(badge.getAttribute("title")).not.toMatch(/-{2}/);
  });
});

describe("LIVE badge on pick rows", () => {
  it("slate row renders it on desktop and mobile layouts when is_live", () => {
    render(<SlatePickRow pick={{ ...slatePick, is_live: true }} />);
    expect(screen.getAllByText("Live")).toHaveLength(2);
  });

  it("slate row omits it for pregame picks and older payloads", () => {
    const { rerender } = render(<SlatePickRow pick={{ ...slatePick, is_live: false }} />);
    expect(screen.queryByText("Live")).toBeNull();
    rerender(<SlatePickRow pick={slatePick} />);
    expect(screen.queryByText("Live")).toBeNull();
  });

  it("versus row renders it when is_live", () => {
    render(<VersusPickRow pick={{ ...slatePick, is_live: true }} />);
    expect(screen.getAllByText("Live")).toHaveLength(1);
  });

  it("pending block renders it per live pick", () => {
    render(
      <PendingBlock
        picks={[
          { ...historyPick, id: 1, is_live: true },
          { ...historyPick, id: 2, is_live: false },
        ]}
      />,
    );
    expect(screen.getAllByText("Live")).toHaveLength(1);
  });

  it("history row renders it on a live parlay ticket", () => {
    render(
      <HistoryRow
        pick={{ ...historyPick, kind: "parlay", parlay_id: 9, leg_count: 2, selection: "2-leg parlay", is_live: true }}
        isLast
      />,
    );
    expect(screen.getAllByText("Live").length).toBeGreaterThan(0);
  });
});
