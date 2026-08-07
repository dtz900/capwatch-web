import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StandingsSection } from "@/components/slate/StandingsSection";
import type { WeekStandings } from "@/lib/week-standings";
import type { SlateCapperSummary } from "@/lib/types";

const dayRow: SlateCapperSummary = {
  capper_id: 1, handle: "dayguy", display_name: null, profile_image_url: null,
  capper_rank: 1, wins: 2, losses: 0, pushes: 0, voids: 0,
  graded_count: 2, pending_count: 0, net_units: 2, current_day_streak: 1,
};

const week: WeekStandings = {
  week_start: "2026-08-03",
  week_end: "2026-08-09",
  days_counted: ["2026-08-03"],
  summary: { graded_count: 4, pending_count: 0, wins: 3, losses: 1, pushes: 0, voids: 0, net_units: 2.2 },
  capper_summary: [
    {
      capper_id: 2, handle: "weekguy", display_name: null, profile_image_url: null,
      capper_rank: 2, wins: 3, losses: 1, pushes: 0, voids: 0,
      graded_count: 4, pending_count: 0, net_units: 2.2, current_day_streak: 3,
    },
  ],
};

describe("StandingsSection", () => {
  it("defaults to the daily view and toggles to weekly and back", () => {
    render(
      <StandingsSection daily={[dayRow]} totalGraded={2} totalPending={0} week={week} dayLabel="Tonight" />,
    );
    expect(screen.getByText("@dayguy")).toBeInTheDocument();
    expect(screen.queryByText("@weekguy")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    expect(screen.getByText("@weekguy")).toBeInTheDocument();
    expect(screen.queryByText("@dayguy")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tonight" }));
    expect(screen.getByText("@dayguy")).toBeInTheDocument();
  });

  it("renders no toggle when week data is absent", () => {
    render(
      <StandingsSection daily={[dayRow]} totalGraded={2} totalPending={0} week={null} dayLabel="Tonight" />,
    );
    expect(screen.queryByRole("button", { name: "This week" })).not.toBeInTheDocument();
    expect(screen.getByText("@dayguy")).toBeInTheDocument();
  });

  it("shows weekly alone (no pills) when daily has nothing graded", () => {
    render(
      <StandingsSection daily={[]} totalGraded={0} totalPending={3} week={week} dayLabel="Tonight" />,
    );
    expect(screen.getByText("@weekguy")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tonight" })).not.toBeInTheDocument();
  });

  it("collapses the weekly view while the day still has pending picks", () => {
    const { container } = render(
      <StandingsSection daily={[dayRow]} totalGraded={2} totalPending={5} week={week} dayLabel="Tonight" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    expect(container.querySelector("details")).not.toBeNull();
    expect(screen.getByText("@weekguy")).toBeInTheDocument();
  });

  it("shows the weekly view prominent once the day is complete", () => {
    const { container } = render(
      <StandingsSection daily={[dayRow]} totalGraded={2} totalPending={0} week={week} dayLabel="Tonight" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    expect(container.querySelector("details")).toBeNull();
    expect(screen.getByText("@weekguy")).toBeInTheDocument();
  });

  it("stays expanded when switching from the daily to the weekly view", () => {
    const { container } = render(
      <StandingsSection daily={[dayRow]} totalGraded={2} totalPending={5} week={week} dayLabel="Tonight" />,
    );
    const daily = container.querySelector("details")!;
    expect(daily.open).toBe(false);
    // Browsers flip `open` then fire `toggle`; jsdom queues that event
    // asynchronously, so drive both steps explicitly to keep this synchronous.
    daily.open = true;
    fireEvent(daily, new Event("toggle"));
    expect(container.querySelector("details")!.open).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    const weekly = container.querySelector("details")!;
    expect(weekly.open).toBe(true);
    expect(screen.getByText("@weekguy")).toBeInTheDocument();
  });

  it("renders nothing when neither view has graded rows", () => {
    const { container } = render(
      <StandingsSection daily={[]} totalGraded={0} totalPending={0} week={null} dayLabel="Tonight" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
