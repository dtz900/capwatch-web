"use client";

import { useState } from "react";

/** Avatar for frozen archive pages. X profile-image URLs rot whenever a
 * capper changes their picture, and an archive is served indefinitely, so a
 * failed load falls back to initials instead of a broken image. Plain <img>
 * on purpose: next/image would log an upstream 404 on every render. */
export function ArchiveAvatar({
  url,
  handle,
  size = 28,
}: {
  url: string | null;
  handle: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const initials = handle.replace(/^@/, "").slice(0, 2).toUpperCase();
  const showImg = Boolean(url) && !broken;
  return (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[rgba(255,255,255,0.10)] bg-[#2a2a2e] shrink-0"
      style={{ width: size, height: size }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url as string}
          alt={initials}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-bold text-[var(--color-text)]" style={{ fontSize: size * 0.36 }}>
          {initials}
        </span>
      )}
    </span>
  );
}
