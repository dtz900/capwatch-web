"use client";

import { Analytics } from "@vercel/analytics/next";

const EXCLUDE_FLAG_KEY = "tailslips_exclude_analytics";

/**
 * Wraps Vercel Analytics with a beforeSend hook that drops events when the
 * exclude flag is set in localStorage. Visit /exclude-me once on each
 * device/browser you want excluded from analytics counts.
 */
export function AnalyticsWithExclusion() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (typeof window === "undefined") return event;
        try {
          if (localStorage.getItem(EXCLUDE_FLAG_KEY) === "1") return null;
        } catch {
          // localStorage may be disabled (private browsing, etc); send the event.
        }
        return event;
      }}
    />
  );
}
