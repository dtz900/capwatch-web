"use client";

/* "Capper's view" tag and the owner's "Make this my default view" control
 * (David, 2026-11-03). Sits beside the league chips: the tag tells a visitor
 * the capper chose what they landed on, the control lets the owner save the
 * view they are looking at. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { saveDefaultView } from "@/lib/capperView";
import { useCapperFilters } from "./CapperFilterProvider";

const TAG =
  "inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] px-2.5 py-1 " +
  "text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)] whitespace-nowrap";

export function CapperDefaultView() {
  const { sport, window, range, profile, capperView, defaultView } = useCapperFilters();
  const { session, capper } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const isOwner = !!capper && capper.id === profile.capper.id;

  if (capperView) {
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
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
    }
  };

  return (
    <button
      type="button"
      onClick={save}
      disabled={state === "saving"}
      className={`${TAG} hover:text-[var(--color-text)] hover:border-[rgba(255,255,255,0.28)] transition-colors disabled:opacity-60`}
      title={defaultView ? "Replace your current default view" : "Visitors land on this view"}
    >
      {state === "saving" ? "Saving" : state === "error" ? "Couldn't save, try again" : "Make this my default view"}
    </button>
  );
}
