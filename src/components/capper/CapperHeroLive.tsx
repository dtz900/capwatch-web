"use client";

import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
import { CapperHero } from "@/components/capper/CapperHero";
import { VipNameCrown, useVipEligible } from "@/components/vip/VipCrown";
import { capperVipEnabledFor } from "@/lib/flags";

/** Hero bound to the filter context. The wrapping div carries the ref the
 * sticky strip observes to know when the full hero has scrolled out of view. */
export function CapperHeroLive() {
  const { profile, displayAgg, displayTrajectory, window, heroRef } = useCapperFilters();
  return capperVipEnabledFor(profile.capper.handle) ? (
    <VipHero />
  ) : (
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

/** Hero with the VIP marks (name crown, purple avatar ring) once the
 *  capper is eligible to sell. A separate component so the status fetch
 *  only runs where Capper VIP is on. */
function VipHero() {
  const { profile, displayAgg, displayTrajectory, window, heroRef } = useCapperFilters();
  const eligible = useVipEligible(profile.capper.id);
  return (
    <div ref={heroRef} className="pt-10">
      <CapperHero
        profile={profile}
        windowAgg={displayAgg}
        trajectorySeries={displayTrajectory}
        window={window}
        nameAdornment={eligible ? <VipNameCrown /> : null}
        vipRing={eligible}
      />
    </div>
  );
}
