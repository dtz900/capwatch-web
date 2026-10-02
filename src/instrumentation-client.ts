import posthog from "posthog-js";
import { POSTHOG_INGEST_PATH, POSTHOG_UI_HOST, isExcludedBrowser, posthogKey } from "@/lib/analytics/posthog-config";

// Next.js runs this once in the browser before the app hydrates. PostHog's
// persistent id (cookie + localStorage) is what gives new vs returning
// visitors and retention, which Vercel Analytics can't (its visitor hash
// resets every 24 hours).
const key = posthogKey();
if (key) {
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  posthog.init(key, {
    api_host: POSTHOG_INGEST_PATH,
    ui_host: POSTHOG_UI_HOST,
    // Pageviews on App Router client navigations, plus pageleave.
    defaults: "2025-05-24",
    // Anonymous visitors are counted without creating person profiles;
    // signed-in users get one through identify() in PostHogIdentify.
    person_profiles: "identified_only",
    disable_session_recording: true,
    opt_out_capturing_by_default: isExcludedBrowser(storage),
  });
}
