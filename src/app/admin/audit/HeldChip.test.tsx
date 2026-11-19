// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeldChip, heldReasonText } from "./HeldChip";

describe("HeldChip", () => {
  it("renders the chip", () => {
    render(<HeldChip />);
    expect(screen.getByText("Held")).toBeTruthy();
  });
  it("words the reason like the review page and hides an empty one", () => {
    expect(heldReasonText("ncaab_unbound")).toBe("ncaab unbound");
    expect(heldReasonText("parser_hold")).toBe("Held by the parser");
    expect(heldReasonText(null)).toBeNull();
    expect(heldReasonText("none")).toBeNull();
  });
});
