"use client";

import { useEffect, useRef } from "react";

export interface KeyLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean; closest?: (sel: string) => unknown } | null;
}

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Pure mapping so a key table is testable without a DOM. The lookup key is the
 * lowercased key, prefixed "shift+" only for shift+space.
 */
export function keyToAction<A extends string>(
  e: KeyLike,
  map: Record<string, A>,
  enterAction: A | null,
): A | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const t = e.target;
  if (t && (TYPING.has((t.tagName ?? "").toUpperCase()) || t.isContentEditable)) return null;
  const name = e.key.toLowerCase();
  const action = map[e.shiftKey && e.key === " " ? `shift+${name}` : name] ?? null;
  // Enter on a link or button belongs to that control.
  if (enterAction !== null && action === enterAction && t) {
    const tag = (t.tagName ?? "").toUpperCase();
    if (tag === "A" || tag === "BUTTON" || t.closest?.("a,button")) return null;
  }
  return action;
}

interface Opts<A extends string> {
  map: Record<string, A>;
  /** Actions that keep firing while the key is held. */
  repeatable: ReadonlySet<A>;
  enterAction: A | null;
  enabled: boolean;
  /** Returning true suppresses the browser default (Enter, or Space scrolling). */
  onAction: (a: A) => boolean | void;
}

export function useAdminKeys<A extends string>(opts: Opts<A>) {
  const ref = useRef(opts);
  useEffect(() => {
    ref.current = opts;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = ref.current;
      if (!cur.enabled) return;
      const action = keyToAction(
        {
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          target: e.target as HTMLElement | null,
        },
        cur.map,
        cur.enterAction,
      );
      if (!action) return;
      if (e.repeat && !cur.repeatable.has(action)) return;
      const acted = cur.onAction(action);
      if (acted === true) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
