import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/api", () => ({ fetchDeletedPicks: vi.fn() }));

import { KeptMark, keptRate, keptState } from "./KeptMark";

describe("kept rate", () => {
  it("floors to one decimal so one deletion never reads 100%", () => {
    expect(keptRate(1, 1251)).toBe(99.9);
    expect(keptRate(0, 40)).toBe(100);
    expect(keptRate(19, 212)).toBe(91);
  });
  it("states: full at zero deletions, near from 95%, low below", () => {
    expect(keptState(0, 50)).toBe("full");
    expect(keptState(1, 40)).toBe("near");
    expect(keptState(3, 40)).toBe("low");
  });
});

describe("KeptMark", () => {
  it("is a solid slip with no text at 100%", () => {
    render(<KeptMark deletedCount={0} tweetsParsed={788} picksCount={788} handle="ibetpeterv" />);
    const mark = screen.getByLabelText(/100% kept/);
    expect(mark.tagName).toBe("SPAN");
    expect(mark.textContent).toBe("");
  });

  it("is a hollow slip that opens the deleted list in the near band", () => {
    render(<KeptMark deletedCount={1} tweetsParsed={1251} picksCount={1251} handle="lottolocks" />);
    const btn = screen.getByRole("button", { name: /99\.9% kept: 1 of 1,?251 slips deleted/ });
    expect(btn.textContent).toBe("");
  });

  it("says the rate out loud below 95%", () => {
    render(<KeptMark deletedCount={19} tweetsParsed={212} picksCount={212} handle="dai_bets" />);
    expect(screen.getByRole("button").textContent).toBe("91% kept");
  });

  it("stays silent under 20 picks or with nothing parsed", () => {
    expect(render(<KeptMark deletedCount={0} tweetsParsed={12} picksCount={12} />).container.innerHTML).toBe("");
    expect(render(<KeptMark deletedCount={0} tweetsParsed={0} picksCount={40} />).container.innerHTML).toBe("");
  });
});
