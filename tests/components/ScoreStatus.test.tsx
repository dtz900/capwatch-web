import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreStatus } from "@/components/slate/ScoreStatus";

describe("ScoreStatus", () => {
  it("renders formatted ET time pill in the pre state", () => {
    render(
      <ScoreStatus
        state="pre"
        awayTeam="CHC"
        homeTeam="STL"
        awayScore={null}
        homeScore={null}
        inning={null}
        inningHalf={null}
        gameTime="2026-05-22T23:05:00Z"
      />,
    );
    expect(screen.getByText(/7:05/)).toBeInTheDocument();
    expect(screen.getByText(/ET/)).toBeInTheDocument();
  });

  it("renders inning pill plus both team score numbers in live", () => {
    render(
      <ScoreStatus
        state="live"
        awayTeam="CHC"
        homeTeam="STL"
        awayScore={2}
        homeScore={1}
        inning={4}
        inningHalf="top"
        gameTime="2026-05-22T23:05:00Z"
      />,
    );
    expect(screen.getByText(/TOP 4/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders FINAL pill, grading pill, and both scores in final_pending", () => {
    render(
      <ScoreStatus
        state="final_pending"
        awayTeam="CHC"
        homeTeam="STL"
        awayScore={5}
        homeScore={3}
        inning={null}
        inningHalf={null}
        gameTime="2026-05-22T23:05:00Z"
      />,
    );
    expect(screen.getByText(/FINAL/)).toBeInTheDocument();
    expect(screen.getByText(/grading/i)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders FINAL pill and scores with no grading suffix in final_graded", () => {
    render(
      <ScoreStatus
        state="final_graded"
        awayTeam="CHC"
        homeTeam="STL"
        awayScore={5}
        homeScore={3}
        inning={null}
        inningHalf={null}
        gameTime="2026-05-22T23:05:00Z"
      />,
    );
    expect(screen.getByText(/FINAL/)).toBeInTheDocument();
    expect(screen.queryByText(/grading/i)).toBeNull();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders MID 7 in the live pill when inning_half is mid", () => {
    render(
      <ScoreStatus
        state="live"
        awayTeam="CHC"
        homeTeam="STL"
        awayScore={3}
        homeScore={3}
        inning={7}
        inningHalf="mid"
        gameTime="2026-05-22T23:05:00Z"
      />,
    );
    expect(screen.getByText(/MID 7/)).toBeInTheDocument();
  });
});
