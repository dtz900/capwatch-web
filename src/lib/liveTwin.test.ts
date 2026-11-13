import { describe, expect, it } from "vitest";
import {
  absoluteTweetUrl,
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
