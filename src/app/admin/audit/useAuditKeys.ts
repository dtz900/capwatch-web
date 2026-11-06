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
  target?: { tagName?: string; isContentEditable?: boolean; closest?: (sel: string) => unknown } | null;
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

/** Actions that keep firing while the key is held. */
export const REPEATABLE: ReadonlySet<AuditKeyAction> = new Set(["next", "prev"]);

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Pure mapping so the key table is testable without a DOM. */
export function keyToAction(e: KeyLike): AuditKeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const t = e.target;
  if (t && (TYPING.has((t.tagName ?? "").toUpperCase()) || t.isContentEditable)) return null;
  const action = MAP[e.key.toLowerCase()] ?? null;
  // Enter on a link or button belongs to that control.
  if (action === "enter" && t) {
    const tag = (t.tagName ?? "").toUpperCase();
    if (tag === "A" || tag === "BUTTON" || t.closest?.("a,button")) return null;
  }
  return action;
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
      // Held J/K scrolls the queue; every other action fires once per press.
      if (e.repeat && !REPEATABLE.has(action)) return;
      if (action === "enter") {
        if (cur.onEnter()) e.preventDefault();
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
