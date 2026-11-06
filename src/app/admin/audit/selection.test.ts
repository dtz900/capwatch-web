import { describe, expect, it } from "vitest";
import { nextSelection } from "./selection";

const rows = (...ids: number[]) => ids.map((pick_id) => ({ pick_id }));

describe("nextSelection", () => {
  it("picks the row that slid into the removed slot", () => {
    expect(nextSelection(rows(1, 3, 4), 1)).toBe(3);
  });
  it("falls back to the previous row when the last one was removed", () => {
    expect(nextSelection(rows(1, 2), 2)).toBe(2);
  });
  it("is null when nothing is left", () => {
    expect(nextSelection([], 0)).toBeNull();
  });
  it("clamps a negative index", () => {
    expect(nextSelection(rows(5), -1)).toBe(5);
  });
});
