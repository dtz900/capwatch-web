"use client";

import { useEffect, useRef } from "react";

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

interface KeyLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}

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

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Pure mapping so the key table is testable without a DOM. */
export function keyToAction(e: KeyLike): AuditKeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const t = e.target;
  if (t && (TYPING.has((t.tagName ?? "").toUpperCase()) || t.isContentEditable)) return null;
  return MAP[e.key.toLowerCase()] ?? null;
}

interface Handlers {
  enabled: boolean;
  onNext: () => void;
  onPrev: () => void;
  onEnter: () => void;
  onGrade: (outcome: GradeOutcome) => void;
  onSkip: () => void;
  onEscape: () => void;
}

export function useAuditKeys(h: Handlers) {
  const ref = useRef(h);
  useEffect(() => {
    ref.current = h;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = ref.current;
      if (!cur.enabled) return;
      const action = keyToAction({
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        target: e.target as HTMLElement | null,
      });
      if (!action) return;
      if (action === "enter") {
        // A focused button would also click on Enter; the flow key wins.
        e.preventDefault();
        cur.onEnter();
      } else if (action === "next") cur.onNext();
      else if (action === "prev") cur.onPrev();
      else if (action === "skip") cur.onSkip();
      else if (action === "escape") cur.onEscape();
      else cur.onGrade(action.slice(6) as GradeOutcome);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
