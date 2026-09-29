"use client";

import { useCapperFilters } from "@/components/capper/CapperFilterProvider";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";
import { buildCapperShareParams } from "@/lib/capperFilters";

/** Share button bound to the live filter state. Builds the shareable URL from
 * the active league / window or date range / bet type / market / outcome (kept
 * in sync with the page URL by the provider), so the OG card the recipient
 * sees reflects exactly the filtered view being shared. */
export function ShareFilteredButton({ prominent = false }: { prominent?: boolean }) {
  const { handle, sport, window, betType, market, outcome, range } = useCapperFilters();
  return (
    <ShareLinkButton
      basePath={`/cappers/${handle}`}
      prominent={prominent}
      queryParams={buildCapperShareParams({ sport, window, betType, market, outcome, range })}
    />
  );
}
