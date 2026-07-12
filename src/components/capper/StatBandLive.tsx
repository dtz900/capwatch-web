"use client";

import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
import { StatBand } from "@/components/capper/StatBand";
import { MarketTailToggle } from "@/components/capper/MarketTailToggle";
import { TailButton } from "@/components/auth/TailButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { followScopeForMarket } from "@/lib/followScope";
import { vipEnabled } from "@/lib/flags";

/** Stat band bound to the filter context. Dims slightly while a bet-type
 * change is in flight (the only filter change that refetches the stats).
 *
 * Owns the profile's tail control, pinned to the band's top-right: while a
 * market filter is active (and maps onto a follow scope) it becomes "Tail
 * this market"; otherwise it's the whole-capper tail. Logged-out users get
 * the whole-capper button, whose click routes through /login. */
export function StatBandLive() {
  const {
    profile,
    displayAgg,
    history,
    displayTrajectory,
    window,
    label,
    market,
    marketDisabled,
    marketScoped,
    loadingStats,
  } = useCapperFilters();
  const { entitlements } = useAuth();

  const scope = market && !marketDisabled ? followScopeForMarket(market) : null;
  const action = !vipEnabled() ? undefined : scope && entitlements.isLoggedIn ? (
    <MarketTailToggle capperId={profile.capper.id} market={scope} pill />
  ) : (
    <TailButton capperId={profile.capper.id} variant="bare" />
  );

  return (
    <div className={`transition-opacity ${loadingStats ? "opacity-60" : ""}`}>
      <StatBand
        agg={displayAgg}
        recentHistory={history}
        trajectorySeries={displayTrajectory}
        window={window}
        scopeLabel={label}
        marketScoped={marketScoped}
        action={action}
      />
    </div>
  );
}
