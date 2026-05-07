"use client";

import { useSyncExternalStore } from "react";

const EXCLUDE_FLAG_KEY = "tailslips_exclude_analytics";
const CHANGE_EVENT = "tailslips:exclude-flag-change";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getClientSnapshot(): boolean {
  try {
    return localStorage.getItem(EXCLUDE_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

// SSR returns null so the initial server-rendered HTML matches a "Loading"
// state. After hydration, the client snapshot kicks in and re-renders.
function getServerSnapshot(): boolean | null {
  return null;
}

export function ExcludeMeClient() {
  const excluded = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  function toggle() {
    try {
      if (localStorage.getItem(EXCLUDE_FLAG_KEY) === "1") {
        localStorage.removeItem(EXCLUDE_FLAG_KEY);
      } else {
        localStorage.setItem(EXCLUDE_FLAG_KEY, "1");
      }
      // Same-tab localStorage writes don't fire the native storage event;
      // dispatch a custom event so the subscriber re-runs.
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // storage disabled
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <h1 className="text-[28px] font-extrabold tracking-[-0.025em] mb-3">
          Analytics exclusion
        </h1>
        <p className="text-[14px] text-[var(--color-text-soft)] leading-relaxed mb-6">
          Vercel Analytics counts every visitor by default, including you while you&apos;re
          working on the site. Toggle this on to drop events from this browser so the
          dashboard reflects real outside traffic.
        </p>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[15px] font-bold mb-1">
                {excluded === null
                  ? "Loading…"
                  : excluded
                    ? "Excluded from analytics"
                    : "Included in analytics"}
              </div>
              <div className="text-[12px] text-[var(--color-text-muted)]">
                {excluded === null
                  ? ""
                  : excluded
                    ? "Events from this browser are being dropped."
                    : "Events from this browser are being counted."}
              </div>
            </div>
            <button
              type="button"
              onClick={toggle}
              disabled={excluded === null}
              className={`px-4 py-2 rounded-lg text-[13px] font-extrabold uppercase tracking-[0.06em]
                          transition-colors disabled:opacity-40
                          ${
                            excluded
                              ? "bg-[var(--color-pos-soft)] text-[var(--color-pos)] hover:bg-[rgba(25,245,124,0.18)]"
                              : "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] hover:bg-[rgba(255,255,255,0.12)]"
                          }`}
            >
              {excluded === null ? "…" : excluded ? "Re-include" : "Exclude me"}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-[var(--color-text-muted)] mt-5 leading-relaxed">
          The flag is stored in this browser&apos;s localStorage. Clear browser data and you&apos;ll
          be counted again until you re-toggle. Visit this page on every device or browser
          you want excluded.
        </p>
      </div>
    </main>
  );
}
