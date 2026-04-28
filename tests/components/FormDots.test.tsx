import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormDots } from "@/components/leaderboard/FormDots";

describe("FormDots", () => {
  it("renders one dot per outcome with the right class", () => {
    render(<FormDots outcomes={["W","L","P","W"]} data-testid="dots" />);
    const wrap = screen.getByTestId("dots");
    expect(wrap.querySelectorAll("span")).toHaveLength(4);
    expect(wrap.querySelectorAll(".bg-\\[var\\(--color-pos\\)\\]")).toHaveLength(2);
    expect(wrap.querySelectorAll(".bg-\\[var\\(--color-neg\\)\\]")).toHaveLength(1);
  });

  it("renders empty wrap when outcomes is empty", () => {
    render(<FormDots outcomes={[]} data-testid="dots" />);
    expect(screen.getByTestId("dots").children).toHaveLength(0);
  });
});
