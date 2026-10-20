import { describe, expect, it } from "vitest";
import { activeContest, activeContests, type SplashContest } from "./contest";

const base: SplashContest = {
  enabled: true,
  slate_date: "2026-10-20",
  title: "Opening Night: NBA Tiers",
  entry: "$25",
  pays: "top 3",
  lock_label: "Locks Tue at noon PT",
  url: "https://app.splashsports.com/contest/abc/detail",
};

// 2026-10-20 09:00 PT is 16:00Z; 2026-10-20 23:30 PT is 06:30Z on the 21st.
const morningOfSlate = new Date("2026-10-20T16:00:00Z");
const lateNightOfSlate = new Date("2026-10-21T06:30:00Z");
const dayAfterSlate = new Date("2026-10-21T16:00:00Z");
const dayBeforeSlate = new Date("2026-10-19T16:00:00Z");

describe("activeContest", () => {
  it("shows the contest on its slate date in PT, including late evening", () => {
    expect(activeContest(base, morningOfSlate)).toEqual(base);
    expect(activeContest(base, lateNightOfSlate)).toEqual(base);
  });

  it("shows an upcoming contest the day before so promo can run early", () => {
    expect(activeContest(base, dayBeforeSlate)).toEqual(base);
  });

  it("never shows a contest once its slate date has passed in PT", () => {
    expect(activeContest(base, dayAfterSlate)).toBeNull();
  });

  it("hides when disabled or when the link is missing", () => {
    expect(activeContest({ ...base, enabled: false }, morningOfSlate)).toBeNull();
    expect(activeContest({ ...base, url: "" }, morningOfSlate)).toBeNull();
  });

  it("only links to Splash", () => {
    expect(activeContest({ ...base, url: "https://evil.example/contest" }, morningOfSlate)).toBeNull();
  });
});

describe("activeContests", () => {
  const nfl: SplashContest = {
    enabled: true,
    sport: "NFL",
    slate_date: "2026-10-26",
    title: "Week 7 Pick 'em",
    entry: "$20",
    pays: "1st place",
    lock_label: "Closes 12 AM PT Oct 25",
    url: "https://app.splashsports.com/contest/def/detail",
  };

  it("lists every open contest from the contests array, soonest slate first", () => {
    const file = { ...base, contests: [nfl, base] };
    expect(activeContests(file, morningOfSlate)).toEqual([base, nfl]);
  });

  it("drops closed, disabled and unlinked contests but keeps the rest", () => {
    const file = { ...base, contests: [base, { ...nfl, url: "" }, { ...nfl, enabled: false }, nfl] };
    expect(activeContests(file, dayAfterSlate)).toEqual([nfl]);
  });

  it("falls back to the legacy single contest when the file has no list", () => {
    expect(activeContests(base, morningOfSlate)).toEqual([base]);
    expect(activeContests(base, dayAfterSlate)).toEqual([]);
    expect(activeContests(null, morningOfSlate)).toEqual([]);
  });
});
