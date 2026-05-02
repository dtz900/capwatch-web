"use client";

import { useState } from "react";
import { teamLogoUrl, teamColor } from "@/lib/mlb-teams";

interface Props {
  abbr: string | null;
  size?: number;
  className?: string;
  /** Disables the team-color drop-shadow halo. Default: enabled. */
  flat?: boolean;
}

/**
 * MLB team logo with a transparent background and a soft team-color halo.
 * Falls back to a colored text mark when the image can't load.
 */
export function TeamLogo({ abbr, size = 28, className, flat = false }: Props) {
  const [failed, setFailed] = useState(false);
  const url = teamLogoUrl(abbr);
  const color = teamColor(abbr);

  const haloRadius = Math.max(2, Math.round(size * 0.11));
  const halo = flat
    ? undefined
    : `drop-shadow(0 0 ${haloRadius}px ${color}66) drop-shadow(0 1px 2px rgba(0,0,0,0.45))`;

  if (!abbr || !url || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center font-extrabold tabular-nums ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(11, Math.floor(size * 0.4)),
          color,
          filter: flat ? undefined : `drop-shadow(0 0 ${haloRadius}px ${color}55)`,
        }}
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
      className={`shrink-0 object-contain transition-transform duration-200 ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        filter: halo,
      }}
    />
  );
}
