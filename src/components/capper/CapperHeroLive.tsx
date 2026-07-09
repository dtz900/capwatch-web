"use client";

import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
import { CapperHero } from "@/components/capper/CapperHero";

/** Hero bound to the filter context. The wrapping div carries the ref the
 * sticky strip observes to know when the full hero has scrolled out of view. */
export function CapperHeroLive() {
  const { profile, displayAgg, displayTrajectory, window, heroRef } = useCapperFilters();
  return (
    <div ref={heroRef} className="pt-10">
      <CapperHero
        profile={profile}
        windowAgg={displayAgg}
        trajectorySeries={displayTrajectory}
        window={window}
      />
    </div>
  );
}
