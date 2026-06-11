"use client";

import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
import { StatBand } from "@/components/capper/StatBand";

/** Stat band bound to the filter context. Dims slightly while a bet-type
 * change is in flight (the only filter change that refetches the stats). */
export function StatBandLive() {
  const {
    displayAgg,
    history,
    displayTrajectory,
    window,
    label,
    marketScoped,
    loadingStats,
  } = useCapperFilters();
  return (
    <div className={`transition-opacity ${loadingStats ? "opacity-60" : ""}`}>
      <StatBand
        agg={displayAgg}
        recentHistory={history}
        trajectorySeries={displayTrajectory}
        window={window}
        scopeLabel={label}
        marketScoped={marketScoped}
      />
    </div>
  );
}
