import { describe, expect, it } from "vitest";
import type { QueueRow } from "./labels";
import { siblingIdsFor } from "./siblings";

function row(over: Partial<QueueRow>): QueueRow {
  return { pick_id: 1, raw_id: 10, sport: "NBA", ...over } as QueueRow;
}

describe("siblingIdsFor", () => {
  const p = row({ pick_id: 1 });
  it("returns other picks from the same tweet and sport", () => {
    expect(siblingIdsFor([p, row({ pick_id: 2 }), row({ pick_id: 3 })], p)).toEqual([2, 3]);
  });
  it("excludes self, other sports and other tweets", () => {
    const rows = [p, row({ pick_id: 2, sport: "MLB" }), row({ pick_id: 3, raw_id: 11 })];
    expect(siblingIdsFor(rows, p)).toEqual([]);
  });
  it("returns nothing when raw_id is null", () => {
    const n = row({ pick_id: 1, raw_id: null });
    expect(siblingIdsFor([n, row({ pick_id: 2, raw_id: null })], n)).toEqual([]);
  });
});
