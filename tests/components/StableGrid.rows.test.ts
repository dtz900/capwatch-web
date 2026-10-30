import { describe, expect, it } from "vitest";
import { rowsAfterLastScope } from "@/components/my-tails/StableGrid";
import type { CapperRow } from "@/lib/types";

const rows = [{ capper_id: 7 }, { capper_id: 8 }] as unknown as CapperRow[];

describe("rowsAfterLastScope", () => {
  it("drops the card when the last market is untailed", () => {
    expect(rowsAfterLastScope(rows, "7", false)).toEqual([{ capper_id: 8 }]);
  });

  it("keeps a subscribed capper's card", () => {
    expect(rowsAfterLastScope(rows, "7", true)).toEqual(rows);
  });
});
