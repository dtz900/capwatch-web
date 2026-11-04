"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isFreshSignup, signupFiredKey, xPixelId, xSignupEventId } from "@/lib/analytics/x-pixel";

const EXCLUDE_FLAG_KEY = "tailslips_exclude_analytics";

type Twq = ((...args: unknown[]) => void) & { exe?: unknown; queue?: unknown[]; version?: string };
type TwqWindow = Window & { twq?: Twq };

function excluded(): boolean {
  try {
    return localStorage.getItem(EXCLUDE_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/** X's base snippet, run on demand: installs the queueing twq stub, injects
 *  uwt.js and configures the pixel. Idempotent, so the conversion below can
 *  call it first and never finds twq missing; calls made before uwt.js lands
 *  sit in the queue and are sent when it loads. */
function loadXPixel(pixelId: string): Twq {
  const w = window as TwqWindow;
  if (w.twq) return w.twq;
  const stub = ((...args: unknown[]) => {
    if (typeof stub.exe === "function") (stub.exe as (...a: unknown[]) => void)(...args);
    else stub.queue!.push(args);
  }) as Twq;
  stub.version = "1.1";
  stub.queue = [];
  w.twq = stub;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://static.ads-twitter.com/uwt.js";
  document.head.appendChild(script);
  stub("config", pixelId);
  return stub;
}

/** X ads pixel: base code on every page (it records the ad click id on
 *  landing) plus the Sign Up conversion, fired once when a brand-new account
 *  signs in for the first time. Catches every sign-in path (magic link, email
 *  code, Google) because it watches the session, not a route. Browsers with
 *  the /exclude-me flag load nothing. Renders nothing. */
export function XPixel() {
  const pixelId = xPixelId();
  const eventId = xSignupEventId();
  const { session, authReady } = useAuth();

  useEffect(() => {
    if (!pixelId || excluded()) return;
    loadXPixel(pixelId);
  }, [pixelId]);

  useEffect(() => {
    if (!pixelId || !eventId || !authReady || excluded()) return;
    const user = session?.user;
    if (!user || !isFreshSignup(user)) return;
    try {
      const key = signupFiredKey(user.id);
      if (localStorage.getItem(key)) return;
      loadXPixel(pixelId)("event", eventId, { conversion_id: user.id });
      localStorage.setItem(key, "1");
    } catch {
      // localStorage blocked: skip rather than risk double counting.
    }
  }, [pixelId, eventId, authReady, session]);

  return null;
}
