"use client";

import { useRef, useState, type ReactNode } from "react";

export type MyTailsTab = "stable" | "board" | "vip";

export interface MyTailsTabSpec {
  key: MyTailsTab;
  label: string;
  content: ReactNode;
}

const SWIPE_MIN_X = 48;
const SWIPE_MAX_SLOPE = 0.65;

/* Sub-page switcher for My Tails: each tab owns a panel instead of stacking.
 * Tabs on every viewport, horizontal swipe on touch (moves through the tabs
 * in display order). Tab state mirrors into ?tab={key} via replaceState so a
 * link is shareable without a server round trip; the first tab is the bare
 * pathname. */
export function MyTailsTabs({
  initialTab,
  tabs,
}: {
  initialTab: MyTailsTab;
  tabs: MyTailsTabSpec[];
}) {
  const [tab, setTab] = useState<MyTailsTab>(initialTab);
  const [slide, setSlide] = useState<"left" | "right" | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const keys = tabs.map((t) => t.key);

  function select(next: MyTailsTab) {
    if (next === tab) return;
    setSlide(keys.indexOf(next) > keys.indexOf(tab) ? "right" : "left");
    setTab(next);
    const url = next === keys[0] ? window.location.pathname : `?tab=${next}`;
    window.history.replaceState(null, "", url);
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_X) return;
    if (Math.abs(dy) / Math.abs(dx) > SWIPE_MAX_SLOPE) return;
    const target = keys[keys.indexOf(tab) + (dx < 0 ? 1 : -1)];
    if (target) select(target);
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="My Tails sections"
        className="flex gap-6 border-b border-[var(--color-border)]"
      >
        {tabs.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`my-tails-panel-${t.key}`}
              onClick={() => select(t.key)}
              className={`-mb-px pb-2.5 text-[13px] font-bold uppercase tracking-[0.12em] transition-colors border-b-2 ${
                active
                  ? "text-[var(--color-text)] border-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        key={tab}
        id={`my-tails-panel-${tab}`}
        role="tabpanel"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`pt-6 ${slide === "right" ? "subpage-in-right" : slide === "left" ? "subpage-in-left" : ""}`}
      >
        {(tabs.find((t) => t.key === tab) ?? tabs[0]).content}
      </div>
    </div>
  );
}
