"use client";

import { track } from "@vercel/analytics";

interface Props {
  handle: string | null | undefined;
  /** Where the link lives, e.g. "profile", "leaderboard", "podium". */
  surface: string;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

/** Outbound link to a capper's X profile that logs an outbound_x_click
 * event. Custom events flow through the same beforeSend hook as pageviews,
 * so the /exclude-me flag still filters these. */
export function XProfileLink({
  handle,
  surface,
  className,
  ariaLabel = "View on X",
  children,
}: Props) {
  return (
    <a
      href={handle ? `https://x.com/${handle}` : "#"}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={className}
      onClick={() => {
        if (handle) track("outbound_x_click", { capper: handle, surface });
      }}
    >
      {children}
    </a>
  );
}
