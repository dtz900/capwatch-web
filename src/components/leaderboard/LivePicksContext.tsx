"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { API_BASE } from "@/lib/config";

const POLL_INTERVAL_MS = 30_000;

// Map of capper_id -> live picks count for tonight's slate. The page is
// ISR-cached; this provider polls a tiny endpoint client-side every 30s so
// the LIVE pulse counts feel near-realtime without forcing every page load
// to wait on the heavy leaderboard query.
type LivePicksMap = Record<number, number>;

const LivePicksContext = createContext<LivePicksMap | null>(null);

interface ProviderProps {
  initial: LivePicksMap;
  children: ReactNode;
}

export function LivePicksProvider({ initial, children }: ProviderProps) {
  const [counts, setCounts] = useState<LivePicksMap>(initial);
  // Skip the first poll on mount; `initial` is fresh from the SSR render.
  const skipNext = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (skipNext.current) {
        skipNext.current = false;
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/public/cappers/live-picks-counts`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as { counts: Record<string, number> };
        if (cancelled) return;
        // Backend returns string keys (JSON object); coerce to numbers.
        const next: LivePicksMap = {};
        for (const [k, v] of Object.entries(body.counts)) {
          next[Number(k)] = v;
        }
        setCounts(next);
      } catch {
        // Network blip; keep last good map.
      }
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    // Refresh immediately on tab focus so the pill catches up after the
    // user comes back from another tab.
    const onFocus = () => {
      skipNext.current = false;
      void tick();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return <LivePicksContext.Provider value={counts}>{children}</LivePicksContext.Provider>;
}

// Returns the live picks count for a capper, falling back to `fallback` when
// no provider is mounted (e.g. capper profile pages).
export function useLivePicksCount(capperId: number | string, fallback = 0): number {
  const map = useContext(LivePicksContext);
  if (map === null) return fallback;
  const cid = typeof capperId === "string" ? Number(capperId) : capperId;
  const live = map[cid];
  return live ?? fallback;
}
