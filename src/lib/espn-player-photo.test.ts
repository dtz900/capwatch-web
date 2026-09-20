import { describe, expect, it } from "vitest";
import { espnHeadshotUrl, espnResizedUrl, pickActionPhoto, type EspnOverview } from "./espn-player-photo";

const img = (url: string, width = 1296) => ({ url, width, height: Math.round((width * 9) / 16) });
const ath = (...ids: number[]) => ids.map((athleteId) => ({ type: "athlete", athleteId }));
const league = (...names: string[]) => names.map((description) => ({ type: "league", description }));

// Shape of site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/{id}/overview
const MAHOMES = 3139477;
const OVERVIEW: EspnOverview = {
  news: [
    {
      headline: "Fantasy football buzz: Josh Allen puts league on notice",
      published: "2026-09-18T12:00Z",
      categories: ath(4361050, 3128429, MAHOMES, 4567048),
      images: [img("https://a.espncdn.com/photo/2026/0918/r1718491_1296x729_16-9.jpg")],
    },
    {
      headline: "Who's the better Week 2 option: Drake Maye or Patrick Mahomes?",
      published: "2026-09-16T12:00Z",
      categories: ath(4431452, MAHOMES),
      images: [img("https://espnmedia-cdn.akamaized.net/espn/media/common/2026/0916/ss.jpg", 576)],
    },
    {
      headline: "Inside Patrick Mahomes' remarkable return from knee surgery",
      published: "2026-09-14T12:00Z",
      categories: ath(MAHOMES),
      images: [img("https://a.espncdn.com/photo/2026/0914/r1716323_1296x729_16-9.jpg")],
    },
    {
      headline: "Chiefs' rookies eager for more success after opener",
      published: "2026-09-18T15:00Z",
      categories: ath(4880124, 4566190, 4832955, MAHOMES, 15847),
      images: [img("https://a.espncdn.com/photo/2026/0918/r1718376_608x342_16-9.jpg", 608)],
    },
  ],
};

describe("pickActionPhoto", () => {
  it("prefers a solo-tagged article whose headline names the player", () => {
    expect(pickActionPhoto(OVERVIEW, MAHOMES, "Mahomes")).toBe(
      "https://a.espncdn.com/photo/2026/0914/r1716323_1296x729_16-9.jpg",
    );
  });

  it("falls to a 2-3 tag article with the name, ESPN CDN only", () => {
    const solo = { ...OVERVIEW, news: OVERVIEW.news!.filter((a) => a.categories!.length !== 1) };
    // The two-tag Maye/Mahomes article is on a non-ESPN host, so it is skipped;
    // nothing else qualifies (the rest tag 4+ athletes).
    expect(pickActionPhoto(solo, MAHOMES, "Mahomes")).toBeNull();
  });

  it("ranks a named 3-tag beat story above an unnamed solo tag", () => {
    const daniels = 4426348;
    const o: EspnOverview = {
      news: [
        {
          headline: "2026 Washington Commanders: Projecting final 53-man roster",
          published: "2026-08-24T12:00Z",
          categories: [...league("NFL"), ...ath(daniels)],
          images: [img("https://a.espncdn.com/photo/2026/0819/r1704062_608x342_16-9.jpg", 608)],
        },
        {
          headline: "Why Commanders are believing in a Jayden Daniels rebound",
          published: "2026-09-12T12:00Z",
          categories: [...league("NFL"), ...ath(daniels, 1, 2)],
          images: [img("https://a.espncdn.com/photo/2026/0804/r1697569_608x342_16-9.jpg", 608)],
        },
      ],
    };
    expect(pickActionPhoto(o, daniels, "Daniels")).toBe(
      "https://a.espncdn.com/photo/2026/0804/r1697569_608x342_16-9.jpg",
    );
  });

  it("skips an article tagged to another league even when it is solo and named", () => {
    const daniels = 4426348;
    const o: EspnOverview = {
      news: [
        {
          headline: "Mets troll Jayden Daniels over LSU NIL dispute",
          published: "2026-08-16T12:00Z",
          categories: [...league("MLB", "NFL", "NCAA Football"), ...ath(daniels)],
          images: [img("https://a.espncdn.com/photo/2026/0815/r1702259_1296x729_16-9.jpg")],
        },
      ],
    };
    expect(pickActionPhoto(o, daniels, "Daniels")).toBeNull();
  });

  it("never returns a crowd article even when the player is tagged", () => {
    const crowd = { news: [OVERVIEW.news![0]] };
    expect(pickActionPhoto(crowd, MAHOMES, "Mahomes")).toBeNull();
  });

  it("handles a missing or malformed payload", () => {
    expect(pickActionPhoto({}, MAHOMES, "Mahomes")).toBeNull();
    expect(pickActionPhoto({ news: [{}] }, MAHOMES, "Mahomes")).toBeNull();
  });
});

describe("url helpers", () => {
  it("builds the headshot cutout url", () => {
    expect(espnHeadshotUrl(MAHOMES)).toBe("https://a.espncdn.com/i/headshots/nfl/players/full/3139477.png");
  });

  it("routes ESPN CDN images through the combiner at the requested size", () => {
    expect(espnResizedUrl("https://a.espncdn.com/photo/2026/0914/r1716323_1296x729_16-9.jpg", 640, 360)).toBe(
      "https://a.espncdn.com/combiner/i?img=/photo/2026/0914/r1716323_1296x729_16-9.jpg&w=640&h=360",
    );
    expect(espnResizedUrl("https://elsewhere.example/x.jpg", 640, 360)).toBeNull();
  });
});
