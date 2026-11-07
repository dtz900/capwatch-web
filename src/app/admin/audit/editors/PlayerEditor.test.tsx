// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueueRow } from "../labels";

const searchMock = vi.fn();
vi.mock("../actions", () => ({
  searchPlayersAction: (...args: unknown[]) => searchMock(...args),
}));

import { PlayerEditor } from "./PlayerEditor";

const pick = {
  pick_id: 1,
  capper_id: 1,
  sport: "NBA",
  capper_handle: "x",
  capper_display_name: null,
  kind: "ungraded",
  reason: "missing_player_id",
  market: "points",
  selection: "Zzyzx o20.5",
  line: 20.5,
  odds_taken: null,
  units: null,
  player_id: null,
  game_id: null,
  game_date: null,
  parlay_id: null,
  posted_at: null,
  raw_id: null,
  tweet_text: null,
  tweet_url: null,
  posted_label: null,
  game_label: null,
} as QueueRow;

function mount() {
  render(<PlayerEditor p={pick} disabled={false} onPatch={async () => {}} />);
}

describe("PlayerEditor empty and error states", () => {
  beforeEach(() => searchMock.mockReset());
  afterEach(cleanup);

  it("explains an empty result", async () => {
    searchMock.mockResolvedValue({ ok: true, results: [], missingTeams: [] });
    mount();
    expect(await screen.findByText("No NBA player matches. Try the surname only.")).toBeTruthy();
  });

  it("shows a failed search with its reason", async () => {
    searchMock.mockResolvedValue({ ok: false, error: "ESPN rosters unavailable" });
    mount();
    expect(await screen.findByText("Player search failed: ESPN rosters unavailable")).toBeTruthy();
  });

  it("names the rosters that did not load", async () => {
    searchMock.mockResolvedValue({ ok: true, results: [], missingTeams: ["LAL"] });
    mount();
    expect(await screen.findByText("Rosters for LAL did not load")).toBeTruthy();
  });
});
