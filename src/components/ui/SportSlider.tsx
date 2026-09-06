"use client";

import { useId } from "react";

/**
 * League slider: a dark pill track, a gold puck that glides to the selected
 * stop, and a rendered ball riding on the puck (baseball for MLB, football
 * for NFL, a split ball for the combined view). Inactive stops are plain
 * text so the one ball is the object on the control. Pure presentation;
 * the caller owns the URL.
 */
export type SportStop = {
  value: string;
  label: string;
  icon: "baseball" | "football" | "both";
};

// --- cubic bezier helpers for the baseball seams -----------------------------
type Pt = { x: number; y: number };
function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}
function cubicTangent(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

/** Seam with alternating V stitches, like a real ball. */
function Seam({ p0, p1, p2, p3 }: { p0: Pt; p1: Pt; p2: Pt; p3: Pt }) {
  const d = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
  const ticks: string[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t = 0.08 + (0.84 * i) / (n - 1);
    const p = cubic(p0, p1, p2, p3, t);
    const tg = cubicTangent(p0, p1, p2, p3, t);
    const len = Math.hypot(tg.x, tg.y) || 1;
    const nx = -tg.y / len;
    const ny = tg.x / len;
    // Alternate the lean so the stitches read as a zig-zag, not a comb.
    const lean = (i % 2 === 0 ? 0.55 : -0.55);
    const dx = nx + (tg.x / len) * lean;
    const dy = ny + (tg.y / len) * lean;
    const m = Math.hypot(dx, dy) || 1;
    const L = 5.2;
    ticks.push(
      `M ${p.x - (dx / m) * L} ${p.y - (dy / m) * L} L ${p.x + (dx / m) * L} ${p.y + (dy / m) * L}`,
    );
  }
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke="#b3261e" strokeWidth="3.4" />
      <path d={ticks.join(" ")} stroke="#c4302b" strokeWidth="2.8" />
    </g>
  );
}

export function Baseball({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <radialGradient id={`bbg-${id}`} cx="36%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1ecdf" />
          <stop offset="100%" stopColor="#aaa08c" />
        </radialGradient>
        <clipPath id={`bbc-${id}`}>
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#bbg-${id})`} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
      <g clipPath={`url(#bbc-${id})`}>
        <Seam p0={{ x: 32, y: -2 }} p1={{ x: 2, y: 30 }} p2={{ x: 2, y: 70 }} p3={{ x: 32, y: 102 }} />
        <Seam p0={{ x: 68, y: -2 }} p1={{ x: 98, y: 30 }} p2={{ x: 98, y: 70 }} p3={{ x: 68, y: 102 }} />
      </g>
      <ellipse cx="36" cy="28" rx="13" ry="8" fill="#fff" opacity="0.45" transform="rotate(-30 36 28)" />
    </svg>
  );
}

export function Football({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  // Drawn in a square box, rotated so it reads as a ball in hand, not a logo.
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <radialGradient id={`fbg-${id}`} cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#b8683a" />
          <stop offset="45%" stopColor="#8a4520" />
          <stop offset="100%" stopColor="#3b1a08" />
        </radialGradient>
        <clipPath id={`fbc-${id}`}>
          <ellipse cx="50" cy="50" rx="47" ry="29" />
        </clipPath>
      </defs>
      <g transform="rotate(-32 50 50)">
        <ellipse cx="50" cy="50" rx="47" ry="29" fill={`url(#fbg-${id})`} stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />
        <g clipPath={`url(#fbc-${id})`} fill="none" stroke="#f4efe4" strokeLinecap="round">
          {/* end stripes */}
          <path d="M 18 18 C 12 40, 12 60, 18 82" strokeWidth="3.2" opacity="0.9" />
          <path d="M 82 18 C 88 40, 88 60, 82 82" strokeWidth="3.2" opacity="0.9" />
          {/* lace spine + cross laces */}
          <path d="M 33 50 H 67" strokeWidth="2.4" opacity="0.85" />
          <path d="M 38 44 V 56 M 44 44 V 56 M 50 44 V 56 M 56 44 V 56 M 62 44 V 56" strokeWidth="3" />
        </g>
        <ellipse cx="34" cy="36" rx="14" ry="5" fill="#fff" opacity="0.18" transform="rotate(-12 34 36)" />
      </g>
    </svg>
  );
}

/** Both balls for the combined view: baseball in front, football tucked behind. */
export function SplitBall({ size = 36, className }: { size?: number; className?: string }) {
  const b = Math.round(size * 0.86);
  return (
    <span
      className={`relative inline-block ${className ?? ""}`}
      style={{ width: Math.round(size * 1.5), height: size }}
      aria-hidden
    >
      <span className="absolute" style={{ left: Math.round(size * 0.55), top: Math.round((size - b) / 2) + 1 }}>
        <Football size={b} />
      </span>
      <span
        className="absolute drop-shadow-[2px_0_3px_rgba(0,0,0,0.45)]"
        style={{ left: 0, top: Math.round((size - b) / 2) }}
      >
        <Baseball size={b} />
      </span>
    </span>
  );
}

function Ball({ icon, size }: { icon: SportStop["icon"]; size: number }) {
  if (icon === "baseball") return <Baseball size={size} />;
  if (icon === "football") return <Football size={size} />;
  return <SplitBall size={size} />;
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
  const ball = lg ? 44 : 34;
  const active = stops[idx];

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-busy={busy}
      className={`relative isolate grid rounded-full bg-[#0b0b0e] p-1
                  border border-[rgba(255,255,255,0.08)]
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_3px_12px_rgba(0,0,0,0.65)]
                  transition-opacity duration-150 ${busy ? "opacity-70" : "opacity-100"}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {/* Puck: gold pill that slides to the active stop and carries the ball
          at its left edge. Under the labels (z-index) so the active label
          reads dark on gold. */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 flex items-center rounded-full
                   bg-[var(--color-gold)]
                   shadow-[0_6px_18px_-6px_rgba(245,197,74,0.75),inset_0_1px_0_rgba(255,255,255,0.4)]
                   transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] -z-10"
        style={{
          width: `calc((100% - 0.5rem) / ${n})`,
          transform: `translateX(${idx * 100}%)`,
          paddingLeft: lg ? 6 : 4,
        }}
      >
        <span
          key={active?.value}
          className="inline-flex drop-shadow-[0_3px_4px_rgba(0,0,0,0.45)] animate-[pop_.35s_cubic-bezier(.22,1,.36,1)]"
        >
          {active && <Ball icon={active.icon} size={ball} />}
        </span>
      </span>
      {stops.map((s) => {
        const on = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s.value)}
            className={`relative flex items-center justify-center rounded-full select-none
                        ${lg ? "h-[56px] sm:h-[60px]" : "h-[44px]"}
                        transition-colors duration-200 ${
              on ? "text-black" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            // Leave room on the active stop for the ball riding the puck.
            style={{ paddingLeft: on ? Math.round(ball * (s.icon === "both" ? 1.5 : 1)) + (lg ? 10 : 8) : 0 }}
          >
            <span
              className={`font-extrabold uppercase tracking-[0.06em] leading-none ${
                lg ? "text-[19px] sm:text-[22px]" : "text-[13px] sm:text-[14px]"
              }`}
            >
              {s.label}
            </span>
          </button>
        );
      })}
      <style>{`@keyframes pop{0%{transform:scale(.6) rotate(-25deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}`}</style>
    </div>
  );
}
