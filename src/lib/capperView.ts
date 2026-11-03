/* Capper-chosen default profile view (David, 2026-11-03). A claimed capper
 * picks the sport and window a visitor lands on when the URL names neither;
 * the profile labels it "Capper's view" and every other view stays one tab
 * away. */
import { vipFetch } from "@/lib/vip/client";
import type { SportFilter, Window } from "@/lib/types";

export interface DefaultView {
  sport: SportFilter | null;
  window: Window | null;
}

const SITE_SPORT: SportFilter = "all";
const SITE_WINDOW: Window = "season";

/** The capper's default fills each part the URL leaves out. A date range
 *  replaces the window, so it never takes the default window. */
export function viewFromDefault(
  url: { sport?: string; window?: string; hasRange: boolean },
  dv: DefaultView | null | undefined,
): { sport: SportFilter | null; window: Window | null } {
  return {
    sport: !url.sport && dv?.sport ? dv.sport : null,
    window: !url.window && !url.hasRange && dv?.window ? dv.window : null,
  };
}

/** The view on screen is the one the capper chose. */
export function isCapperView(
  dv: DefaultView | null | undefined,
  sport: SportFilter,
  window: Window,
  rangeActive: boolean,
): boolean {
  if (!dv || rangeActive) return false;
  return (dv.sport ?? SITE_SPORT) === sport && (dv.window ?? SITE_WINDOW) === window;
}

export function saveDefaultView(token: string | null, view: DefaultView) {
  return vipFetch<{ ok: boolean; default_view: DefaultView | null }>("/api/me/default-view", {
    method: "PUT",
    token,
    body: JSON.stringify(view),
  });
}
