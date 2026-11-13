import { describe, expect, it } from "vitest";
import {
  absoluteTweetUrl,
  IDENTITY_PATCH_KEYS,
  touchesIdentity,
  entryFromDetail,
  entryFromRefused,
  parseDuplicateDetail,
  twinDifferences,
  type LiveTwin,
} from "./liveTwin";

const DETAIL =
  "Already live as pick 121563 ('Saint Joes +6.5' line 6.5 units 1, posted 11-11 19:48 UTC, x.com/sexualslips/status/2120604645089267820). Price or stake differs: this one -112, 1.12u vs no odds, 1u. May be a deliberate second bet.";

const TWIN: LiveTwin = {
  pick_id: 121563,
  raw_id: 149205,
  selection: "Saint Joes +6.5",
  line: 6.5,
  odds_taken: null,
  units: 1,
  posted_at: "2026-11-11T19:48:40+00:00",
  tweet_id: "2120604645089267820",
  tweet_url: "https://x.com/sexualslips/status/2120604645089267820",
  units_differ: true,
  differs_in_units: true,
  differs_in_price: false,
  this_units: 1.12,
  this_odds: -112,
};

describe("parseDuplicateDetail", () => {
  it("reads the detail out of a 409 error string", () => {
    expect(parseDuplicateDetail(`409: ${JSON.stringify({ detail: DETAIL })}`)).toBe(DETAIL);
  });
  it("accepts a bare detail sentence", () => {
    expect(parseDuplicateDetail(DETAIL)).toBe(DETAIL);
  });
  it("ignores other statuses and other 409s", () => {
    expect(parseDuplicateDetail(`500: ${JSON.stringify({ detail: DETAIL })}`)).toBeNull();
    expect(parseDuplicateDetail('409: {"detail":"pick already graded"}')).toBeNull();
    expect(parseDuplicateDetail("409: not json")).toBeNull();
    expect(parseDuplicateDetail("fetch failed")).toBeNull();
    expect(parseDuplicateDetail('409: {"detail":{"x":1}}')).toBeNull();
  });
});

describe("entryFromDetail", () => {
  it("breaks the sentence into readable parts", () => {
    const e = entryFromDetail(121564, DETAIL);
    expect(e.pickId).toBe(121564);
    expect(e.existingPickId).toBe(121563);
    expect(e.existing).toBe("Saint Joes +6.5, 1u, posted 11-11 19:48 UTC");
    expect(e.tweetUrl).toBe("https://x.com/sexualslips/status/2120604645089267820");
    expect(e.differs).toBe(
      "Price or stake differs: this one is -112, 1.12u, the live one is no odds, 1u. This may be a deliberate second bet.",
    );
  });
  it("has no difference line when price and stake match", () => {
    const e = entryFromDetail(
      2,
      "Already live as pick 5 ('A +1' line 1.0 units 1, posted 11-11 19:48 UTC, x.com/h/status/9).",
    );
    expect(e.differs).toBeNull();
    expect(e.existingPickId).toBe(5);
  });
  it("falls back to the API sentence for an unknown shape", () => {
    const e = entryFromDetail(2, "Already live as pick 5, somewhere");
    expect(e.existingPickId).toBe(5);
    expect(e.reason).toBe("Already live as pick 5, somewhere");
    expect(e.tweetUrl).toBeNull();
  });
});

describe("entryFromRefused", () => {
  it("uses the live twin object and marks same-batch copies", () => {
    const e = entryFromRefused(
      { pick_id: 121564, reason: DETAIL, same_batch: true, live_twin: TWIN },
      () => "Nov 11, 11:48 AM",
    );
    expect(e.sameBatch).toBe(true);
    expect(e.existingPickId).toBe(121563);
    expect(e.existing).toBe("Saint Joes +6.5, 1u, posted Nov 11, 11:48 AM");
    expect(e.differs).toContain("stake 1.12u vs 1u");
    expect(e.differs).not.toContain("price");
  });
  it("parses the reason when the twin object is missing", () => {
    const e = entryFromRefused({ pick_id: 7, reason: DETAIL, same_batch: false, live_twin: null }, () => "");
    expect(e.existingPickId).toBe(121563);
  });
});

describe("twinDifferences and absoluteTweetUrl", () => {
  it("reports only the fields that differ, with no-odds spelled out", () => {
    const d = twinDifferences({ ...TWIN, differs_in_price: true }, { odds: null, units: null });
    expect(d.price).toEqual({ mine: "-112", live: "no odds" });
    expect(d.stake).toEqual({ mine: "1.12u", live: "1u" });
    const same = twinDifferences({ ...TWIN, differs_in_units: false, units_differ: false }, { odds: null, units: null });
    expect(same).toEqual({ price: null, stake: null });
  });
  it("makes bare x.com links absolute and rejects anything else", () => {
    expect(absoluteTweetUrl("x.com/a/status/1")).toBe("https://x.com/a/status/1");
    expect(absoluteTweetUrl("https://x.com/a/status/1")).toBe("https://x.com/a/status/1");
    expect(absoluteTweetUrl("javascript:alert(1)")).toBeNull();
    expect(absoluteTweetUrl(null)).toBeNull();
  });
});

// Strings below are the exact output of refusal_text in the platform's core/live_twin.py.
const REAL = {
  spreadOddsUnits:
    "Already live as pick 121563 ('Saint Joes +6.5' line 6.5 odds -110 units 1, posted 11-11 19:48 UTC, x.com/sexualslips/status/2120604645089267820).",
  moneylineOdds:
    "Already live as pick 121563 ('Villanova ML' odds -110 units 1, posted 11-11 19:48 UTC, x.com/sexualslips/status/2120604645089267820).",
  noOddsNoUnits:
    "Already live as pick 121563 ('Saint Joes +6.5' line 6.5, posted 11-11 19:48 UTC, x.com/sexualslips/status/2120604645089267820).",
  noPosted:
    "Already live as pick 121563 ('Saint Joes +6.5' line 6.5 odds -110 units 1, x.com/sexualslips/status/2120604645089267820).",
  noLink: "Already live as pick 121563 ('Saint Joes +6.5' line 6.5 odds -110 units 1, posted 11-11 19:48 UTC).",
  tricky:
    "Already live as pick 121563 ('O'Neal \"Shaq\" (1H) +3' line 6.5 odds -110 units 1, posted 11-11 19:48 UTC, x.com/sexualslips/status/2120604645089267820).",
  differsBoth:
    "Already live as pick 121563 ('Saint Joes +6.5' line 6.5 units 1, posted 11-11 19:48 UTC, x.com/sexualslips/status/2120604645089267820). Price or stake differs: this one -112, 1.12u vs no odds, 1u. May be a deliberate second bet.",
  differsUnitsOnly:
    "Already live as pick 121563 ('Saint Joes +6.5' line 6.5 odds -110 units 1, posted 11-11 19:48 UTC, x.com/sexualslips/status/2120604645089267820). Price or stake differs: this one no odds, 1.12u vs -110, 1u. May be a deliberate second bet.",
  differsNoUnits:
    "Already live as pick 121563 ('Saint Joes +6.5' line 6.5 odds -110, posted 11-11 19:48 UTC, x.com/sexualslips/status/2120604645089267820). Price or stake differs: this one -112, no units vs -110, no units. May be a deliberate second bet.",
  sameBatch:
    "Duplicate of pick 121563 in this batch ('Saint Joes +6.5' line 6.5 odds -110 units 1, posted 11-11 19:48 UTC, x.com/sexualslips/status/2120604645089267820).",
  bare: "Already live as pick 121563 ('Saint Joes +6.5').",
};
const URL1 = "https://x.com/sexualslips/status/2120604645089267820";
const wrap = (d: string) => `409: ${JSON.stringify({ detail: d })}`;

describe("every refusal_text shape", () => {
  it("every real string passes the 409 parser", () => {
    for (const d of Object.values(REAL)) expect(parseDuplicateDetail(wrap(d))).toBe(d);
  });
  it("spread with odds and units", () => {
    const e = entryFromDetail(1, REAL.spreadOddsUnits);
    expect(e).toMatchObject({ existingPickId: 121563, tweetUrl: URL1, differs: null, sameBatch: false });
    expect(e.existing).toBe("Saint Joes +6.5, -110, 1u, posted 11-11 19:48 UTC");
  });
  it("moneyline with odds and no line", () => {
    expect(entryFromDetail(1, REAL.moneylineOdds).existing).toBe("Villanova ML, -110, 1u, posted 11-11 19:48 UTC");
  });
  it("no odds and no units", () => {
    const e = entryFromDetail(1, REAL.noOddsNoUnits);
    expect(e.existing).toBe("Saint Joes +6.5, posted 11-11 19:48 UTC");
    expect(e.tweetUrl).toBe(URL1);
  });
  it("no posted time", () => {
    const e = entryFromDetail(1, REAL.noPosted);
    expect(e.existing).toBe("Saint Joes +6.5, -110, 1u");
    expect(e.tweetUrl).toBe(URL1);
  });
  it("no tweet link", () => {
    const e = entryFromDetail(1, REAL.noLink);
    expect(e.existing).toBe("Saint Joes +6.5, -110, 1u, posted 11-11 19:48 UTC");
    expect(e.tweetUrl).toBeNull();
  });
  it("selection with an apostrophe, quotes and parentheses", () => {
    const e = entryFromDetail(1, REAL.tricky);
    expect(e.existing).toBe('O\'Neal "Shaq" (1H) +3, -110, 1u, posted 11-11 19:48 UTC');
    expect(e.tweetUrl).toBe(URL1);
  });
  it("only the selection", () => {
    const e = entryFromDetail(1, REAL.bare);
    expect(e.existing).toBe("Saint Joes +6.5");
    expect(e.existingPickId).toBe(121563);
  });
  it("the price or stake differs sentence in each form", () => {
    expect(entryFromDetail(1, REAL.differsBoth).differs).toBe(
      "Price or stake differs: this one is -112, 1.12u, the live one is no odds, 1u. This may be a deliberate second bet.",
    );
    expect(entryFromDetail(1, REAL.differsUnitsOnly).differs).toBe(
      "Price or stake differs: this one is no odds, 1.12u, the live one is -110, 1u. This may be a deliberate second bet.",
    );
    expect(entryFromDetail(1, REAL.differsNoUnits).differs).toBe(
      "Price or stake differs: this one is -112, no units, the live one is -110, no units. This may be a deliberate second bet.",
    );
  });
  it("same-batch wording", () => {
    const e = entryFromDetail(2, REAL.sameBatch);
    expect(e).toMatchObject({ sameBatch: true, existingPickId: 121563, tweetUrl: URL1 });
    expect(e.existing).toBe("Saint Joes +6.5, -110, 1u, posted 11-11 19:48 UTC");
  });
  it("an unrecognised sentence stays plain text, never JSON or a status", () => {
    const d = "Already live as pick 9 and then the format changed";
    const detail = parseDuplicateDetail(wrap(d));
    expect(detail).toBe(d);
    const e = entryFromDetail(3, detail as string);
    expect(e.existing).toBe("");
    expect(e.reason).toBe(d);
    expect(e.reason).not.toMatch(/^409|\{/);
  });
});

describe("absoluteTweetUrl hosts", () => {
  it("links only x.com and twitter.com", () => {
    expect(absoluteTweetUrl("https://twitter.com/a/status/1")).toBe("https://twitter.com/a/status/1");
    expect(absoluteTweetUrl("https://evil.example/x.com/a")).toBeNull();
    expect(absoluteTweetUrl("evil.example/a/status/1")).toBeNull();
    expect(absoluteTweetUrl("https://x.com.evil.example/a")).toBeNull();
    expect(absoluteTweetUrl("ftp://x.com/a")).toBeNull();
  });
});

describe("identity fields", () => {
  it("lists what defines a duplicate and leaves odds and units out", () => {
    expect([...IDENTITY_PATCH_KEYS].sort()).toEqual(["game_id", "line", "player_id", "selection", "sport", "stat_name"]);
    expect(touchesIdentity({ line: 1 })).toBe(true);
    expect(touchesIdentity({ odds_taken: -110, units: 2 })).toBe(false);
    expect(touchesIdentity({})).toBe(false);
  });
});
