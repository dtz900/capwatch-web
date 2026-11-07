import { describe, expect, it } from "vitest";
import { markTweetLine, reasonLabel } from "./reviewLabels";

describe("reviewLabels", () => {
  it("labels known and unknown reasons", () => {
    expect(reasonLabel("nba_player_unresolved")).toEqual({ text: "Player not found at final", soft: false });
    expect(reasonLabel("guard_quarantine:board_grid_not_a_pick").text).toBe("Looks like a board grid");
    expect(reasonLabel("some_new_thing").text).toBe("some new thing");
    expect(reasonLabel(null)).toEqual({ text: "No reason recorded", soft: true });
    expect(reasonLabel("")).toEqual({ text: "No reason recorded", soft: true });
    expect(reasonLabel("none")).toEqual({ text: "No reason recorded", soft: true });
    expect(reasonLabel("parser_hold").text).toBe("Held by the parser");
  });
  it("keeps the colon part of an unknown reason as-is", () => {
    expect(reasonLabel("new_guard:keep_this").text).toBe("new guard:keep_this");
  });
  it("marks the tweet line for the pick", () => {
    const out = markTweetLine("A\nAnthony Davis 10+ Rebounds\nB", "Anthony Davis 10+ Rebounds");
    expect(out.map((l) => l.marked)).toEqual([false, true, false]);
  });
  it("marks nothing when no line matches", () => {
    expect(markTweetLine("Gonzaga -3", "Zags ML").every((l) => !l.marked)).toBe(true);
  });
  it("marks only the first match and handles null or empty selections", () => {
    const t = "Anthony Davis o10\nanthony davis o11";
    expect(markTweetLine(t, "Anthony Davis").map((l) => l.marked)).toEqual([true, false]);
    expect(markTweetLine(t, null).every((l) => !l.marked)).toBe(true);
    expect(markTweetLine(t, "  ").every((l) => !l.marked)).toBe(true);
    expect(markTweetLine("Lakers ML\nx", "Lakers").map((l) => l.marked)).toEqual([true, false]);
  });
});
