import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

// A fixture rather than the real public/splash-contest.json: the live file is
// empty between contests, and these tests are about the component, not the
// day's data.
const fixture = vi.hoisted(() => ({
  enabled: true,
  slate_date: "2026-10-20",
  title: "Opening Night: NBA Tiers",
  entry: "$25",
  pays: "top 3",
  lock_label: "Locks Tue at noon PT",
  url: "https://app.splashsports.com/contest/abc/detail?utm_source=SplashWeb&utm_content=btn_invite",
  contests: [
    { enabled: true, sport: "NBA", slate_date: "2026-10-20", title: "Opening Night: NBA Tiers", entry: "$25", pays: "top 3", lock_label: "Locks Tue at noon PT", url: "https://app.splashsports.com/contest/abc/detail?utm_source=SplashWeb&utm_content=btn_invite" },
    { enabled: true, sport: "NFL", slate_date: "2026-10-26", title: "Week 7 Pick 'em", entry: "$20", pays: "1st place", lock_label: "Closes 12 AM PT Oct 25", closes_at: "2026-10-25T00:00:00-07:00", url: "https://app.splashsports.com/contest/def/detail" },
  ],
}));
vi.mock("../../../public/splash-contest.json", () => ({ default: fixture }));

import { SplashContests, withPlacement } from "./SplashContests";

const live = fixture.contests;
const latest = live.map((c) => c.slate_date).sort().at(-1)!;

describe("SplashContests", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("lists every published contest with an Enter link and the disclosure", () => {
    vi.setSystemTime(new Date(`${live[0].slate_date}T18:00:00Z`));
    render(<SplashContests placement="home" />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.getAttribute("href")).toMatch(/^https:\/\/app\.splashsports\.com\//);
      expect(link.getAttribute("href")).toContain("utm_content=tailslips-home");
    }
    expect(screen.getByText(live[0].title)).toBeInTheDocument();
    expect(screen.getByText(/commissioner rewards/i)).toBeInTheDocument();
  });

  it("ships the module in server HTML so the streamed slot never collapses before hydration", () => {
    vi.setSystemTime(new Date(`${live[0].slate_date}T18:00:00Z`));
    const html = renderToStaticMarkup(<SplashContests placement="home" />);
    expect(html).toContain("TailSlips contests on Splash Sports");
    expect(html).toContain(live[0].title);
  });

  it("renders nothing once every slate date has passed", () => {
    const after = new Date(`${latest}T12:00:00Z`);
    after.setUTCDate(after.getUTCDate() + 2);
    vi.setSystemTime(after);
    const { container } = render(<SplashContests placement="home" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("withPlacement", () => {
  it("replaces Splash's utm_content with the TailSlips surface and keeps the rest", () => {
    const out = withPlacement("https://app.splashsports.com/contest/x/detail?utm_source=SplashWeb&utm_content=btn_invite&utm_campaign=x", "slate");
    expect(out).toContain("utm_source=SplashWeb");
    expect(out).toContain("utm_campaign=x");
    expect(out).toContain("utm_content=tailslips-slate");
    expect(out).not.toContain("btn_invite");
  });

  it("returns an unparseable url untouched", () => {
    expect(withPlacement("not a url", "home")).toBe("not a url");
  });
});
