import { describe, expect, it } from "vitest";
import { errorDetail, heldKind, isHeld, parseReview, type QueueRow } from "./labels";

describe("parseReview", () => {
  it("keeps a valid status and reason", () => {
    expect(parseReview({ review_status: "needs_review", review_reason: "ncaab_unbound", regrade_approves: true })).toEqual({
      review_status: "needs_review",
      review_reason: "ncaab_unbound",
      regrade_approves: true,
    });
  });
  it("drops anything off-contract", () => {
    expect(parseReview({ review_status: "weird", review_reason: 5, regrade_approves: "yes" })).toEqual({
      review_status: undefined,
      review_reason: null,
      regrade_approves: false,
    });
    expect(parseReview({})).toEqual({ review_status: undefined, review_reason: null, regrade_approves: false });
    expect(parseReview({ review_status: "needs_review", review_reason: "  " }).review_reason).toBeNull();
  });
});

describe("held helpers", () => {
  const r = (over: Partial<QueueRow>) => over as QueueRow;
  it("tells a held straight from a held parlay leg", () => {
    expect(isHeld({ review_status: "needs_review" })).toBe(true);
    expect(isHeld({ review_status: "auto_approved" })).toBe(false);
    expect(heldKind(r({ review_status: "needs_review", parlay_id: null, regrade_approves: true }))).toBe("approves");
    expect(heldKind(r({ review_status: "needs_review", parlay_id: null }))).toBe("straight");
    expect(heldKind(r({ review_status: "needs_review", parlay_id: 4 }))).toBe("parlay");
    expect(heldKind(r({ parlay_id: null }))).toBeNull();
  });
});

describe("errorDetail", () => {
  it("pulls a JSON detail out of a failed call", () => {
    expect(errorDetail('400: {"detail":"No game bound."}')).toBe("No game bound.");
  });
  it("returns null for plain text, non-string detail, or bad JSON", () => {
    expect(errorDetail("500: boom")).toBeNull();
    expect(errorDetail('400: {"detail":[1]}')).toBeNull();
    expect(errorDetail("400: {oops")).toBeNull();
  });
});
