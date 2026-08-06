import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CapperWeekRanking } from "@/components/slate/CapperWeekRanking";
import type { WeekStandings } from "@/lib/week-standings";

const week: WeekStandings = {
  week_start: "2026-08-03",
  week_end: "2026-08-09",
  days_counted: ["2026-08-03", "2026-08-04"],
  summary: { graded_count: 5, pending_count: 2, wins: 3, losses: 2, pushes: 0, voids: 0, net_units: 1.4 },
  capper_summary: [
    {
      capper_id: 1, handle: "sharpguy", display_name: "Sharp Guy",
      profile_image_url: null, capper_rank: 3, wins: 3, losses: 2, pushes: 0,
      voids: 0, graded_count: 5, pending_count: 2, net_units: 1.4,
      current_day_streak: 2,
    },
    {
      capper_id: 2, handle: "pendingonly", display_name: null,
      profile_image_url: null, capper_rank: null, wins: 0, losses: 0, pushes: 0,
      voids: 0, graded_count: 0, pending_count: 1, net_units: 0,
      current_day_streak: null,
    },
  ],
};

describe("CapperWeekRanking", () => {
  it("renders the week headline, range and graded rows only", () => {
    render(<CapperWeekRanking week={week} />);
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText(/Aug 3\s*-\s*Aug 9/)).toBeInTheDocument();
    expect(screen.getByText("@sharpguy")).toBeInTheDocument();
    // capper with zero graded picks stays off the ranking
    expect(screen.queryByText("@pendingonly")).not.toBeInTheDocument();
  });

  it("renders a collapsed details strip when collapsed", () => {
    const { container } = render(<CapperWeekRanking week={week} collapsed />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
    expect(screen.getByText("Show ranking")).toBeInTheDocument();
    // rows still exist inside the collapsed details
    expect(screen.getByText("@sharpguy")).toBeInTheDocument();
  });

  it("keeps the toggle out of the collapsed summary row, below the header instead", () => {
    const { container } = render(
      <CapperWeekRanking week={week} collapsed toggleSlot={<button>pills</button>} />,
    );
    const summary = container.querySelector("summary")!;
    expect(summary.querySelector("button")).toBeNull();
    const details = container.querySelector("details")!;
    expect(details.querySelector("button")).not.toBeNull();
  });

  it("renders the prominent card when not collapsed", () => {
    const { container } = render(<CapperWeekRanking week={week} />);
    expect(container.querySelector("details")).toBeNull();
    expect(container.querySelector("section")).not.toBeNull();
  });

  it("returns nothing when no capper has graded picks", () => {
    const empty = { ...week, capper_summary: [week.capper_summary[1]] };
    const { container } = render(<CapperWeekRanking week={empty} />);
    expect(container.firstChild).toBeNull();
  });
});
