import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SplashContestPill } from "./SplashContestPill";
import contestJson from "../../../public/splash-contest.json";

describe("SplashContestPill", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("links to the published Splash contest on its slate date with the disclosure", () => {
    vi.setSystemTime(new Date(`${contestJson.slate_date}T18:00:00Z`));
    render(<SplashContestPill />);
    const link = screen.getByRole("link", { name: /enter on splash/i });
    expect(link).toHaveAttribute("href", contestJson.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/commissioner rewards/i)).toBeInTheDocument();
  });

  it("renders nothing once the slate date has passed", () => {
    const after = new Date(`${contestJson.slate_date}T12:00:00Z`);
    after.setUTCDate(after.getUTCDate() + 2);
    vi.setSystemTime(after);
    const { container } = render(<SplashContestPill />);
    expect(container).toBeEmptyDOMElement();
  });
});
