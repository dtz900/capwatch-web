// tests/components/SportBadge.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SportBadge } from "@/components/parlay-palace/SportBadge";

describe("SportBadge", () => {
  it("labels an NFL entry", () => {
    render(<SportBadge sport="NFL" />);
    expect(screen.getByText("NFL")).toBeInTheDocument();
  });

  it("labels an MLB entry", () => {
    render(<SportBadge sport="MLB" />);
    expect(screen.getByText("MLB")).toBeInTheDocument();
  });

  it("falls back to MLB for an entry written before the column existed", () => {
    render(<SportBadge sport={null} />);
    expect(screen.getByText("MLB")).toBeInTheDocument();
  });

  it("normalizes a lowercase sport from the API", () => {
    render(<SportBadge sport="nfl" />);
    expect(screen.getByText("NFL")).toBeInTheDocument();
  });
});
