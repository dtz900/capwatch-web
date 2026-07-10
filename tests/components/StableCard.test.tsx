// tests/components/StableCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StableCard } from "@/components/my-tails/StableCard";
import type { CapperRow } from "@/lib/types";

const capper = {
  capper_id: 2,
  handle: "sbr_bets",
  display_name: "SBR",
  profile_image_url: null,
  units_profit: 76.3,
  roi_pct: 18.5,
  win_rate: 0.46,
  picks_count: 198,
  current_day_streak: -2,
  trajectory_units: [0, 1.5, 3.1, 2.2, 4.4],
  last_picks: [
    { kind: "straight", market: "total", selection: "Over", outcome: "W", posted_at: "2026-07-07T00:00:00Z" },
    { kind: "straight", market: "ML", selection: "DET", outcome: "L", posted_at: "2026-07-06T00:00:00Z" },
  ],
  live_picks_count: 1,
} as unknown as CapperRow;

describe("StableCard", () => {
  it("renders name, focal units, supporting line and links to the profile", () => {
    render(<StableCard capper={capper} onUntail={() => {}} />);
    expect(screen.getByText("SBR")).toBeInTheDocument();
    expect(screen.getByText("+76.3")).toBeInTheDocument();
    expect(screen.getByText(/18\.5% ROI/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/cappers/sbr_bets");
  });

  it("fires onUntail from the corner control", () => {
    const spy = vi.fn();
    render(<StableCard capper={capper} onUntail={spy} />);
    fireEvent.click(screen.getByRole("button", { name: /untail/i }));
    expect(spy).toHaveBeenCalled();
  });

  it("renders scoped market rows instead of the season block", () => {
    const edge = {
      market: "HRR", n_decided: 90, roi_pct: 13.4, xroi_pct: 4.2,
      clv_beat_pct: null, clv_avg_cents: null, clv_n: 0,
      tracked_days: 73, gate_pass: true, gate_reasons: [],
      originator: false, tail_at_close_roi: null,
    };
    render(
      <StableCard
        capper={capper}
        onUntail={() => {}}
        scopes={["HRR"]}
        scopeEdges={[edge]}
        onUntailMarket={() => {}}
      />
    );
    expect(screen.getByText(/Hits \+ Runs \+ RBIs only/)).toBeInTheDocument();
    expect(screen.getByText("real edge")).toBeInTheDocument();
    expect(screen.queryByText("Net profit")).not.toBeInTheDocument();
  });

  it("fires onUntailMarket from the scope row control", () => {
    const spy = vi.fn();
    const edge = {
      market: "HRR", n_decided: 90, roi_pct: 13.4, xroi_pct: 4.2,
      clv_beat_pct: null, clv_avg_cents: null, clv_n: 0,
      tracked_days: 73, gate_pass: true, gate_reasons: [],
      originator: false, tail_at_close_roi: null,
    };
    render(
      <StableCard capper={capper} onUntail={() => {}} scopes={["HRR"]}
        scopeEdges={[edge]} onUntailMarket={spy} />
    );
    fireEvent.click(screen.getByRole("button", { name: /untail hits \+ runs \+ rbis/i }));
    expect(spy).toHaveBeenCalledWith("HRR");
  });
});
