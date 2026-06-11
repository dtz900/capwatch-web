"use client";

import { useEffect, useState } from "react";
import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
import { RecentTrajectory } from "@/components/capper/RecentTrajectory";
import { formatHandle, formatRoi, formatUnits } from "@/lib/formatters";

/** Flat strip that pins below the nav once the hero scrolls out of view. Shows
 * the handle, the active scope, a mini sparkline, and the live net profit + ROI
 * for the current filters. Fixed-positioned so it never shifts page layout. */
export function StickyProfileStrip() {
  const { heroRef, handle, displayAgg, displayTrajectory, label } = useCapperFilters();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    // Reveal when the hero is no longer intersecting the area below the 64px
    // nav. threshold 0 + the nav-height rootMargin fires right as the hero's
    // bottom edge passes under the nav.
    const obs = new IntersectionObserver(
      ([entry]) => setRevealed(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [heroRef]);

  if (!displayAgg) return null;

  const unitsPositive = displayAgg.units_profit >= 0;
  const roiPositive = (displayAgg.roi_pct ?? 0) >= 0;

  return (
    <div
      aria-hidden={!revealed}
      className={`fixed top-16 left-0 right-0 z-20 bg-[var(--color-bg)] border-b border-[var(--color-border)]
                  transition-all duration-200
                  ${revealed ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-7 h-14 flex items-center gap-4">
        <span className="text-[13px] font-extrabold tracking-[-0.01em] shrink-0">
          {formatHandle(handle)}
        </span>
        <span className="hidden sm:block text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold shrink-0">
          {label}
        </span>
        {displayTrajectory.length >= 2 && (
          <div className="hidden md:block shrink-0">
            <RecentTrajectory series={displayTrajectory} width={120} height={32} hideLabel />
          </div>
        )}
        <div className="flex items-center gap-4 ml-auto shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
              Net
            </span>
            <span
              className={`text-[15px] font-extrabold tabular-nums ${
                unitsPositive ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
              }`}
            >
              {formatUnits(displayAgg.units_profit)}u
            </span>
          </div>
          <div className="hidden sm:flex items-baseline gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
              ROI
            </span>
            <span
              className={`text-[15px] font-extrabold tabular-nums ${
                roiPositive ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
              }`}
            >
              {formatRoi(displayAgg.roi_pct)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
