"use client";

import { useEffect, useState } from "react";
import { buildClickUrl, type SportsbookCreative } from "@/lib/affiliates";

interface Props {
  creative: SportsbookCreative;
  /**
   * Stable placement identifier reported to CJ via `?sid=`. Use kebab-case
   * slugs like "capper-inline" or "slate-header" so we can compare
   * conversion rate across surfaces in CJ's reporting UI.
   */
  placement: string;
  className?: string;
  /** Show the FTC + responsible-gambling disclosure under the banner. */
  showDisclosure?: boolean;
}

/**
 * Picks the mobile click URL when the user-agent looks like iOS or
 * Android, desktop URL otherwise. iPadOS reports as Mac in modern
 * Safari, so we check for touch + Mac too. Server-rendered HTML always
 * carries the desktop URL (better SEO default + matches non-JS clients);
 * the swap on mount is invisible to users since the href is not visible
 * UI and hydration completes in well under 100ms.
 */
function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  // iPadOS 13+ Safari masquerades as desktop Mac. Touch-capable Mac =
  // iPad in practice (no MacBook ships with a touchscreen).
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

export function SportsbookAd({
  creative,
  placement,
  className,
  showDisclosure = true,
}: Props) {
  // Default to desktop URL on first render so SSR HTML and SEO crawlers
  // see a browser-completable destination. Swap to mobile URL after
  // hydration if the visitor is on a phone or tablet.
  const [clickUrl, setClickUrl] = useState(creative.clickUrlDesktop);

  useEffect(() => {
    if (isMobileUserAgent()) {
      setClickUrl(creative.clickUrlMobile);
    } else {
      setClickUrl(creative.clickUrlDesktop);
    }
  }, [creative]);

  const href = buildClickUrl(clickUrl, placement);
  return (
    <div className={className}>
      {/* Canvas + frame styling. The PNG creative has an alpha channel
          and was designed for light publishers, so we paint a warm
          off-white behind it (#f7f3e9 reads as cream, less harsh than
          pure white against the dark TailSlips theme) and ring it with
          a translucent gold border. The gold echoes BetMGM's own brand
          accents and bridges the brightness gap so the ad doesn't pop
          off the page like a flashbang. */}
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={creative.alt}
        className="inline-block leading-none rounded-md overflow-hidden border border-[rgba(245,197,74,0.45)] shadow-[0_0_24px_-12px_rgba(245,197,74,0.35)]"
        style={{ maxWidth: "100%", background: "#f7f3e9" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={creative.imageUrl}
          alt={creative.alt}
          width={creative.width}
          height={creative.height}
          loading="lazy"
          style={{ display: "block", maxWidth: "100%", height: "auto" }}
        />
      </a>
      {showDisclosure && (
        <div className="mt-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] font-bold opacity-70 text-center whitespace-nowrap">
          Sponsored · 21+ ·{" "}
          <a
            href="https://sports.betmgm.com/en/sports/terms-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-100"
          >
            Terms
          </a>
          {" "}· 1-800-GAMBLER
        </div>
      )}
    </div>
  );
}
