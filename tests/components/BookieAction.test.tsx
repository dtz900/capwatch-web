import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookieAction } from "@/components/slate/BookieAction";

describe("BookieAction", () => {
  it("renders side P&L plus net-to-book on a winning-book game", () => {
    render(
      <BookieAction
        awayUnits={-3.1}
        homeUnits={2.45}
        otherUnits={0.5}
        allVoided={false}
      />,
    );
    expect(screen.getByText(/AWAY backers/i)).toBeInTheDocument();
    expect(screen.getByText(/−3\.10u|-3\.10u/)).toBeInTheDocument();
    expect(screen.getByText(/HOME backers/i)).toBeInTheDocument();
    expect(screen.getByText(/\+2\.45u/)).toBeInTheDocument();
    expect(screen.getByText(/Other markets/i)).toBeInTheDocument();
    expect(screen.getByText(/\+0\.50u/)).toBeInTheDocument();
    expect(screen.getByText(/Net to the book/i)).toBeInTheDocument();
    expect(screen.getByText(/\+0\.15u/)).toBeInTheDocument();
  });

  it("renders 'all picks voided' instead of zeros when allVoided is true", () => {
    render(
      <BookieAction awayUnits={0} homeUnits={0} otherUnits={0} allVoided={true} />,
    );
    expect(screen.getByText(/all picks voided/i)).toBeInTheDocument();
    expect(screen.queryByText(/Net to the book/i)).toBeNull();
  });

  it("renders a losing-book game with negative net", () => {
    render(
      <BookieAction
        awayUnits={4.2}
        homeUnits={1.1}
        otherUnits={0}
        allVoided={false}
      />,
    );
    expect(screen.getByText(/Net to the book/i)).toBeInTheDocument();
    expect(screen.getByText(/−5\.30u|-5\.30u/)).toBeInTheDocument();
  });
});
