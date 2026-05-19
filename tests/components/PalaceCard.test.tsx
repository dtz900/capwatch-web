// tests/components/PalaceCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PalaceCard } from "@/components/parlay-palace/PalaceCard";
import type { PalaceEntry } from "@/lib/types";

const entry = {
  slug: "lottolocks-5leg-2026-05-18", title: "t",
  capper_handle: "lottolocks", recap_blurb: "r", units_profit: 25.98,
  combined_odds: 2598, leg_count: 5, slate_date: "2026-05-18",
  hero_kind: "photo", hero_url: "https://img.mlbstatic.com/x.jpg",
  body: {} as PalaceEntry["body"], published_at: "2026-05-18T05:00:00Z",
} as PalaceEntry;

describe("PalaceCard", () => {
  it("links to the detail page and shows units + odds", () => {
    render(<PalaceCard entry={entry} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href",
      "/parlay-palace/lottolocks-5leg-2026-05-18");
    expect(screen.getByText("+25.98u")).toBeInTheDocument();
    expect(screen.getByText(/\+2598/)).toBeInTheDocument();
  });
});
