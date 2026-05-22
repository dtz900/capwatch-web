"use client";

import { useState } from "react";

interface Props {
  /** Path component of the URL to share, e.g. "/cappers/foo" or "/slate". */
  basePath: string;
  /**
   * Query params to preserve in the share URL. Pass undefined for values at
   * their page default so the URL stays clean.
   */
  queryParams?: Record<string, string | undefined>;
  label?: string;
  /** Render a more prominent button instead of the muted default. */
  prominent?: boolean;
}

/**
 * One-click "copy share URL" button. Builds a fresh URL on every click with
 * a unix-second cache-bust appended, so each share gets a different URL that
 * X is forced to re-scrape. X retired its card validator, so a per-share URL
 * fingerprint is the only reliable way to force a fresh OG card from a
 * link that was previously posted.
 *
 * Avoids the "?v=" vs "&v=" footgun by always using URLSearchParams.
 */
export function ShareLinkButton({
  basePath,
  queryParams = {},
  label = "Share",
  prominent = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const onClick = async () => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      if (v != null && v !== "") qs.set(k, v);
    }
    qs.set("v", String(Math.floor(Date.now() / 1000)));
    const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://tailslips.com";
    const url = `${origin}${path}?${qs.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError(false);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("[ShareLinkButton] clipboard write failed", err);
      setError(true);
      setTimeout(() => setError(false), 2400);
    }
  };

  const baseCls = prominent
    ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--color-accent,#5eead4)] text-[#06121b] text-[12px] font-bold uppercase tracking-[0.08em] hover:opacity-90 transition-opacity"
    : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)] text-[11px] font-bold uppercase tracking-[0.08em] hover:text-white hover:bg-[rgba(255,255,255,0.10)] transition-colors";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copy share link"
      className={baseCls}
    >
      {copied ? (
        <>
          <CheckIcon />
          Copied
        </>
      ) : error ? (
        <>
          <ErrorIcon />
          Try again
        </>
      ) : (
        <>
          <LinkIcon />
          {label}
        </>
      )}
    </button>
  );
}

function LinkIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
