"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STORAGE_KEY = "tailslips_leaderboard_prefs_v1";
const PREF_KEYS = ["window", "sort", "bet_type", "active_only"] as const;

/**
 * Persists the leaderboard filter state across navigation. When the user
 * changes window/sort/bet_type/active_only via FilterBar, the URL updates
 * and this component snapshots those params to localStorage. When the user
 * later navigates back to `/` with no params (e.g. clicked the nav
 * "Leaderboard" link), this component restores the saved params via
 * router.replace so the page re-renders with the prior filters applied.
 *
 * Renders nothing. Server component still owns the fetch — this just
 * massages the URL so the server component receives the right searchParams.
 */
export function LeaderboardPrefsRestorer() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const hasAny = PREF_KEYS.some((k) => params.get(k) !== null);

    if (hasAny) {
      // Snapshot the current params so the next visit can restore them.
      const snapshot: Record<string, string> = {};
      for (const k of PREF_KEYS) {
        const v = params.get(k);
        if (v !== null) snapshot[k] = v;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Storage disabled or quota exceeded; persistence is best-effort.
      }
      return;
    }

    // No params on the URL: restore from localStorage if anything saved.
    let saved: Record<string, string> | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw) as Record<string, string>;
    } catch {
      // Ignore parse errors and fall through to defaults.
    }

    if (!saved || Object.keys(saved).length === 0) return;

    const sp = new URLSearchParams();
    for (const k of PREF_KEYS) {
      if (saved[k] !== undefined) sp.set(k, saved[k]);
    }
    const qs = sp.toString();
    if (qs) router.replace(`/?${qs}`);
  }, [params, router]);

  return null;
}
