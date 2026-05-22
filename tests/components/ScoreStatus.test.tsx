import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreStatus } from "@/components/slate/ScoreStatus";

describe("ScoreStatus", () => {
  it("renders formatted ET time in the pre state", () => {
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

  it("renders inning half + inning + score in the live state", () => {
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
    expect(screen.getByText(/CHC 2/)).toBeInTheDocument();
    expect(screen.getByText(/STL 1/)).toBeInTheDocument();
  });

  it("renders FINAL with grading suffix in final_pending", () => {
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
    expect(screen.getByText(/CHC 5/)).toBeInTheDocument();
    expect(screen.getByText(/STL 3/)).toBeInTheDocument();
  });

  it("renders FINAL with score and no grading suffix in final_graded", () => {
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
    expect(screen.getByText(/CHC 5/)).toBeInTheDocument();
    expect(screen.getByText(/STL 3/)).toBeInTheDocument();
  });

  it("renders MID 7 when inning_half is mid", () => {
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
