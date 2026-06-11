"use client";

import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";

/** Share button bound to the live filter state. Builds the shareable URL from
 * the active window / bet type / market / outcome (kept in sync with the page
 * URL by the provider), so the OG card the recipient sees reflects exactly the
 * filtered view being shared. A specific market implies straights, mirroring
 * the filter bar and the OG renderer. */
export function ShareFilteredButton({ prominent = false }: { prominent?: boolean }) {
  const { handle, window, betType, market, outcome } = useCapperFilters();
  const effBetType = market ? "straights" : betType;
  return (
    <ShareLinkButton
      basePath={`/cappers/${handle}`}
      prominent={prominent}
      queryParams={{
        window: window !== "season" ? window : undefined,
        bet_type: effBetType !== "all" ? effBetType : undefined,
        market: market || undefined,
        outcome: outcome || undefined,
      }}
    />
  );
}
