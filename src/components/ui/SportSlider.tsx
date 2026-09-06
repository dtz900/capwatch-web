"use client";

import { useId } from "react";

/**
 * League slider: a dark pill track, a gold puck that glides to the selected
 * stop, and a ball on each stop (baseball for MLB, football for NFL, both
 * for the combined view). Pure presentation; the caller owns the URL.
 */
export type SportStop = {
  value: string;
  label: string;
  icon: "baseball" | "football" | "both";
};

export function Baseball({ size = 18, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <clipPath id={`bb-${id}`}>
          <circle cx="12" cy="12" r="10" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="10" fill="#f7f3e9" stroke="currentColor" strokeWidth="1.4" />
      <g clipPath={`url(#bb-${id})`} fill="none" stroke="#c9302c" strokeWidth="1.5" strokeLinecap="round">
        <path d="M5.5 2.5c3.2 2.6 3.2 16.4 0 19" />
        <path d="M18.5 2.5c-3.2 2.6-3.2 16.4 0 19" />
        <path d="M6.6 6.2l1.8.9M6.6 9.4l1.9.4M6.6 12.6l1.9-.3M6.6 15.8l1.8-.9" />
        <path d="M17.4 6.2l-1.8.9M17.4 9.4l-1.9.4M17.4 12.6l-1.9-.3M17.4 15.8l-1.8-.9" />
      </g>
    </svg>
  );
}

export function Football({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <g transform="rotate(-45 12 12)">
        <ellipse cx="12" cy="12" rx="10.5" ry="6" fill="#8b4a1f" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.2 12h15.6" stroke="#f7f3e9" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
        <path d="M8.5 12v-2M10.3 12v-2M12 12v-2M13.7 12v-2M15.5 12v-2" stroke="#f7f3e9" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M8.5 11h7" stroke="#f7f3e9" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function StopIcon({ icon, size }: { icon: SportStop["icon"]; size: number }) {
  if (icon === "baseball") return <Baseball size={size} />;
  if (icon === "football") return <Football size={size} />;
  return (
    <span className="inline-flex items-center -space-x-1">
      <Baseball size={Math.round(size * 0.85)} />
      <Football size={Math.round(size * 0.85)} />
    </span>
  );
}

export function SportSlider({
  stops,
  value,
  onChange,
  size = "md",
  ariaLabel = "Sport",
  busy = false,
}: {
  stops: SportStop[];
  value: string;
  onChange: (value: string) => void;
  size?: "md" | "lg";
  ariaLabel?: string;
  busy?: boolean;
}) {
  const idx = Math.max(0, stops.findIndex((s) => s.value === value));
  const n = stops.length;
  const lg = size === "lg";
  const iconSize = lg ? 26 : 20;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-busy={busy}
      className={`relative isolate grid rounded-full bg-[#0c0c10] p-1
                  border border-[rgba(255,255,255,0.08)]
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_2px_10px_rgba(0,0,0,0.6)]
                  transition-opacity duration-150 ${busy ? "opacity-70" : "opacity-100"}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {/* Puck: slides between stops. Sits under the labels (z-0) so the
          active label reads dark on gold. */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full bg-[var(--color-gold)]
                   shadow-[0_4px_14px_-4px_rgba(245,197,74,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]
                   transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] -z-10"
        style={{
          width: `calc((100% - 0.5rem) / ${n})`,
          transform: `translateX(${idx * 100}%)`,
        }}
      />
      {stops.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s.value)}
            className={`relative flex items-center justify-center gap-2 rounded-full select-none
                        ${lg ? "px-4 py-3.5 sm:py-4" : "px-3 py-2.5"}
                        transition-colors duration-200 ${
              active
                ? "text-black"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <span
              className={`inline-flex transition-transform duration-300 ${
                active ? "scale-110 text-black" : "scale-100 opacity-80"
              }`}
            >
              <StopIcon icon={s.icon} size={iconSize} />
            </span>
            <span
              className={`font-extrabold tracking-[-0.01em] leading-none ${
                lg ? "text-[20px] sm:text-[24px]" : "text-[14px] sm:text-[15px]"
              }`}
            >
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
