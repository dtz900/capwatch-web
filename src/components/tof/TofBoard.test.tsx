import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TofBoard } from "./TofBoard";
import type { TofBoardRow, TofStats } from "@/lib/types";

const stats: TofStats = { window: "month", plays: 5, wins: 3, losses: 2, pushes: 0, units: 1.2, day_streak: 1, best_day_streak: 2 };

function row(over: Partial<TofBoardRow>): TofBoardRow {
  return { rank: 1, username: "mkfades", avatar_url: null, capper_handle: null, plays: 20, wins: 12, losses: 8, pushes: 0, units: 4.5, day_streak: 2, ...over };
}

describe("TofBoard avatars", () => {
  it("renders the photo when a row has one and the initial when it does not", () => {
    render(<TofBoard rows={[row({ username: "bigbuckbets", avatar_url: "https://pbs/bbb.jpg" }), row({ rank: 2, username: "mkfades" })]} me={null} minPlays={10} />);
    expect(screen.getByRole("img", { name: "bigbuckbets" })).toHaveAttribute("src", "https://pbs/bbb.jpg");
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("links a verified row to the capper page and leaves others plain", () => {
    render(<TofBoard rows={[row({ username: "bigbuckbets", capper_handle: "bigbuckbets" }), row({ rank: 2, username: "mkfades" })]} me={null} minPlays={10} />);
    expect(screen.getByRole("link", { name: "bigbuckbets" })).toHaveAttribute("href", "/cappers/bigbuckbets");
    expect(screen.queryByRole("link", { name: "mkfades" })).toBeNull();
  });

  it("shows the pinned me row with its avatar", () => {
    render(<TofBoard rows={[]} me={{ username: "TailSlips", stats, avatar_url: "https://pbs/ts.jpg", capper_handle: null }} minPlays={10} />);
    expect(screen.getByRole("img", { name: "TailSlips" })).toHaveAttribute("src", "https://pbs/ts.jpg");
  });
});
