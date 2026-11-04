"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isFreshSignup, signupFiredKey, xPixelId, xSignupEventId } from "@/lib/analytics/x-pixel";

const EXCLUDE_FLAG_KEY = "tailslips_exclude_analytics";

type Twq = (...args: unknown[]) => void;

/** X ads pixel: base code on every page (it records the ad click id on
 *  landing) plus the Sign Up conversion, fired once when a brand-new account
 *  signs in for the first time. Catches every sign-in path (magic link, email
 *  code, Google) because it watches the session, not a route. Respects the
 *  /exclude-me flag. Renders nothing when the pixel is switched off. */
export function XPixel() {
  const pixelId = xPixelId();
  const eventId = xSignupEventId();
  const { session, authReady } = useAuth();

  useEffect(() => {
    if (!pixelId || !eventId || !authReady) return;
    const user = session?.user;
    if (!user || !isFreshSignup(user)) return;
    try {
      if (localStorage.getItem(EXCLUDE_FLAG_KEY) === "1") return;
      const key = signupFiredKey(user.id);
      if (localStorage.getItem(key)) return;
      const twq = (window as unknown as { twq?: Twq }).twq;
      if (!twq) return;
      twq("event", eventId, { conversion_id: user.id });
      localStorage.setItem(key, "1");
    } catch {
      // localStorage blocked: skip rather than risk double counting.
    }
  }, [pixelId, eventId, authReady, session]);

  if (!pixelId) return null;
  return (
    <Script id="x-pixel" strategy="afterInteractive">
      {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config',${JSON.stringify(pixelId)});`}
    </Script>
  );
}
