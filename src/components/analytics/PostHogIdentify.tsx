"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { peekAnonId } from "@/lib/tof/anon";
import { posthogKey } from "@/lib/analytics/posthog-config";

/** Ties a signed-in browser to its account so guest visits before sign-up
 *  and visits from other devices land on one person, and clears it on
 *  sign-out. The Tail or Fade guest id rides along so PostHog people can be
 *  matched to tof_guest_swipes rows. Renders nothing. */
export function PostHogIdentify() {
  const { session, authReady, profile } = useAuth();
  const identified = useRef<string | null>(null);

  useEffect(() => {
    if (!posthogKey() || !authReady) return;
    const userId = session?.user?.id ?? null;
    if (userId && identified.current !== userId) {
      const props: Record<string, string> = {};
      const anon = peekAnonId();
      if (anon) props.tof_anon_id = anon;
      if (profile?.username) props.username = profile.username;
      posthog.identify(userId, props);
      identified.current = userId;
    } else if (!userId && identified.current) {
      posthog.reset();
      identified.current = null;
    }
  }, [session, authReady, profile?.username]);

  return null;
}
