"use client";

import { useState } from "react";
import { teamLogoUrl } from "@/lib/mlb-teams";

interface Props {
  abbr: string | null;
  size?: number;
  className?: string;
}

/**
 * Circular MLB team logo from ESPN CDN, with text fallback if the image fails
 * to load (covers abbr mismatches and CDN outages).
 */
export function TeamLogo({ abbr, size = 28, className }: Props) {
  const [failed, setFailed] = useState(false);
  const url = teamLogoUrl(abbr);

  if (!abbr || !url || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] font-bold tabular-nums ${className ?? ""}`}
        style={{ width: size, height: size, fontSize: Math.max(9, Math.floor(size * 0.36)) }}
        aria-label={abbr ?? "team"}
      >
        {abbr ?? "?"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${abbr} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full bg-[rgba(255,255,255,0.04)] object-contain ${className ?? ""}`}
      style={{ width: size, height: size, padding: Math.floor(size * 0.08) }}
    />
  );
}
