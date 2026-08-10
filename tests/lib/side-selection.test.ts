import { describe, expect, it } from "vitest";
import { sideSelection } from "@/app/admin/audit/sideSelection";

describe("sideSelection", () => {
  it("swaps an ambiguous team token for the chosen abbr, keeping ML", () => {
    expect(sideSelection("Sox ML", "BOS")).toBe("BOS ML");
  });

  it("drops multi-word team names down to the abbr", () => {
    expect(sideSelection("White Sox ML", "CWS")).toBe("CWS ML");
  });

  it("keeps a spread tail", () => {
    expect(sideSelection("Sox -1.5", "BOS")).toBe("BOS -1.5");
  });

  it("keeps an over/under tail", () => {
    expect(sideSelection("Sox U8.5", "BOS")).toBe("BOS U8.5");
    expect(sideSelection("Sox U 8.5", "BOS")).toBe("BOS U 8.5");
  });

  it("bare team token becomes just the abbr", () => {
    expect(sideSelection("Sox", "BOS")).toBe("BOS");
  });

  it("handles null/empty selection", () => {
    expect(sideSelection(null, "BOS")).toBe("BOS");
    expect(sideSelection("  ", "BOS")).toBe("BOS");
  });

  it("keeps moneyline spelled out", () => {
    expect(sideSelection("Sox Moneyline", "BOS")).toBe("BOS Moneyline");
  });

  it("keeps a positive-odds tail", () => {
    expect(sideSelection("Sox +130", "BOS")).toBe("BOS +130");
  });
});
