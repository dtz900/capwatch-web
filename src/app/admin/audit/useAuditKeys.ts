"use client";

import { keyToAction as genericKeyToAction, useAdminKeys, type KeyLike } from "../useAdminKeys";

export type { KeyLike };

export type AuditKeyAction =
  | "next"
  | "prev"
  | "enter"
  | "grade:win"
  | "grade:loss"
  | "grade:push"
  | "grade:void"
  | "skip"
  | "escape";

export type GradeOutcome = "win" | "loss" | "push" | "void";

const MAP: Record<string, AuditKeyAction> = {
  j: "next",
  k: "prev",
  enter: "enter",
  w: "grade:win",
  l: "grade:loss",
  p: "grade:push",
  v: "grade:void",
  a: "skip",
  escape: "escape",
};

/** Actions that keep firing while the key is held. */
export const REPEATABLE: ReadonlySet<AuditKeyAction> = new Set(["next", "prev"]);

/** Pure mapping so the key table is testable without a DOM. */
export function keyToAction(e: KeyLike): AuditKeyAction | null {
  return genericKeyToAction(e, MAP, "enter");
}

interface Handlers {
  enabled: boolean;
  onNext: () => void;
  onPrev: () => void;
  /** Returns true when it acted; only then is the browser default suppressed. */
  onEnter: () => boolean;
  onGrade: (outcome: GradeOutcome) => void;
  onSkip: () => void;
  onEscape: () => void;
}

export function useAuditKeys(h: Handlers) {
  useAdminKeys<AuditKeyAction>({
    map: MAP,
    repeatable: REPEATABLE,
    enterAction: "enter",
    enabled: h.enabled,
    onAction: (action) => {
      if (action === "enter") return h.onEnter();
      if (action === "next") h.onNext();
      else if (action === "prev") h.onPrev();
      else if (action === "skip") h.onSkip();
      else if (action === "escape") h.onEscape();
      else h.onGrade(action.slice(6) as GradeOutcome);
    },
  });
}
