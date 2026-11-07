"use client";

import { useAdminKeys } from "../useAdminKeys";

export type ReviewKeyAction = "next" | "prev" | "approve" | "reject" | "select" | "selectTweet" | "escape";

export const REVIEW_KEY_MAP: Record<string, ReviewKeyAction> = {
  j: "next",
  k: "prev",
  enter: "approve",
  r: "reject",
  " ": "select",
  "shift+ ": "selectTweet",
  escape: "escape",
};

/** Actions that keep firing while the key is held. */
export const REVIEW_REPEATABLE: ReadonlySet<ReviewKeyAction> = new Set(["next", "prev"]);

interface Handlers {
  enabled: boolean;
  onNext: () => void;
  onPrev: () => void;
  /** Returns true when it acted; only then is the browser default suppressed. */
  onApprove: () => boolean;
  onReject: () => void;
  onSelect: () => void;
  onSelectTweet: () => void;
  onEscape: () => void;
}

export function useReviewKeys(h: Handlers) {
  useAdminKeys<ReviewKeyAction>({
    map: REVIEW_KEY_MAP,
    repeatable: REVIEW_REPEATABLE,
    enterAction: "approve",
    enabled: h.enabled,
    onAction: (action) => {
      if (action === "approve") return h.onApprove();
      if (action === "next") h.onNext();
      else if (action === "prev") h.onPrev();
      else if (action === "reject") h.onReject();
      else if (action === "select") {
        h.onSelect();
        return true;
      } else if (action === "selectTweet") {
        h.onSelectTweet();
        return true;
      } else h.onEscape();
    },
  });
}
