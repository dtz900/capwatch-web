"use client";

/* "Capper's view" tag and the owner's "Show visitors this view first" control
 * (David, 2026-11-03). Sits beside the league chips: the tag tells a visitor
 * the capper chose what they landed on, the control lets the owner save the
 * view they are looking at. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { isCapperView, saveDefaultView, type DefaultView } from "@/lib/capperView";
import { useCapperFilters } from "./CapperFilterProvider";

const PROFILE_CACHE_MS = 6000;

const TAG =
  "inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] px-2.5 py-1 " +
  "text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)] whitespace-nowrap";

export function CapperDefaultView() {
  const { sport, window, range, profile, capperView, defaultView } = useCapperFilters();
  const { session, capper } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  // Just saved: the profile cache can serve the old default for a few
  // seconds, so the saved view rules here until the page catches up.
  const [saved, setSaved] = useState<DefaultView | null>(null);
  const isOwner = !!capper && capper.id === profile.capper.id;
  const current = saved ?? defaultView;
  const showTag = saved ? isCapperView(saved, sport, window, range !== null) : capperView;

  if (showTag) {
    return (
      <span className={TAG} title="The view this capper chose to show first">
        <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
        Capper&apos;s view
      </span>
    );
  }
  // A date range is not a preset the default can hold.
  if (!isOwner || range) return null;

  const save = async () => {
    setState("saving");
    try {
      await saveDefaultView(session?.access_token ?? null, { sport, window });
      setSaved({ sport, window });
      setState("idle");
      // After the 5 s profile cache, so the refresh reads the new default.
      setTimeout(() => router.refresh(), PROFILE_CACHE_MS);
    } catch {
      setState("error");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={save}
        disabled={state === "saving"}
        className={`${TAG} hover:text-[var(--color-text)] hover:border-[rgba(255,255,255,0.28)] transition-colors disabled:opacity-60`}
        title={current ? "Replaces the view visitors see first now" : "Visitors land on this view"}
      >
        {state === "saving" ? "Saving" : state === "error" ? "Couldn't save, try again" : "Show visitors this view first"}
      </button>
      {/* Owner only, until a view is saved: what visitors land on today. */}
      {!current && (
        <p className="basis-full text-[12px] text-[var(--color-text-muted)]">
          Visitors land on All &middot; Season. Pick a league and window, then save it as your view.
        </p>
      )}
    </>
  );
}
