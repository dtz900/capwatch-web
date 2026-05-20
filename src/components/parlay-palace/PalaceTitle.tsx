// Grand header treatment for /parlay-palace. Replaces a plain h1 with a
// Cinzel-serif title flanked by gold filigree flourishes, with a kicker,
// a wax-seal style ornamental medallion, and a description below. Reads
// as "you walked into a hall of fame", not "you opened a dashboard".

export function PalaceTitle({
  kicker, title, description,
}: { kicker?: string; title: string; description?: string }) {
  return (
    <header className="pt-12 pb-10 relative text-center">
      {kicker && (
        <div
          className="text-[10px] uppercase tracking-[0.5em] font-extrabold mb-5"
          style={{ color: "#caa45a" }}
        >
          {kicker}
        </div>
      )}

      {/* Title + flanking flourishes */}
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <Flourish side="left" />
        <h1
          className="palace-shimmer-text font-[family-name:var(--font-cinzel)] font-black uppercase tracking-[0.04em] leading-[1] text-[28px] sm:text-[44px] md:text-[56px]"
        >
          {title}
        </h1>
        <Flourish side="right" />
      </div>

      {/* Wax-seal style ornamental crown medallion below the title */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <span
          aria-hidden
          className="h-px w-12 sm:w-20"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(202,164,90,0.55), transparent)",
          }}
        />
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-7 h-7 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #f3e3b3, #caa45a 55%, #6f5421)",
            boxShadow:
              "0 0 0 1px rgba(202,164,90,0.7), 0 0 14px rgba(202,164,90,0.35)",
          }}
        >
          {/* tiny crown glyph */}
          <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden>
            <path
              d="M3 17h18l-2 3H5l-2-3zM3 8l4 4 5-7 5 7 4-4v7H3V8z"
              fill="#1a1306"
            />
          </svg>
        </span>
        <span
          aria-hidden
          className="h-px w-12 sm:w-20"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(202,164,90,0.55), transparent)",
          }}
        />
      </div>

      {description && (
        <p className="mt-6 text-[13px] sm:text-[14px] text-[rgba(255,255,255,0.62)] max-w-[58ch] mx-auto leading-[1.7]">
          {description}
        </p>
      )}
    </header>
  );
}

// Filigree flourish flanking the title. SVG: a horizontal line that
// curls inward and ends in a small spiral / leaf, mirrored on the
// opposite side. Pure gold gradient stroke.
function Flourish({ side }: { side: "left" | "right" }) {
  const flip = side === "right" ? "scale(-1,1)" : undefined;
  return (
    <svg
      width="64"
      height="22"
      viewBox="0 0 64 22"
      aria-hidden
      className="shrink-0 hidden sm:block opacity-90"
      style={{ transform: flip }}
    >
      <defs>
        <linearGradient id={`flourish-${side}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#caa45a" stopOpacity="0" />
          <stop offset="35%" stopColor="#caa45a" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#f3e3b3" stopOpacity="1" />
          <stop offset="100%" stopColor="#8a6e3a" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d="M2 11 C 18 11, 30 11, 44 11 C 50 11, 55 8, 56 6 C 57 4, 56 2, 54 2 C 52 2, 51 4, 53 6 C 55 8, 60 8, 62 11 C 60 14, 55 14, 53 16 C 51 18, 52 20, 54 20 C 56 20, 57 18, 56 16 C 55 14, 50 11, 44 11"
        stroke={`url(#flourish-${side})`}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="44" cy="11" r="2" fill={`url(#flourish-${side})`} />
    </svg>
  );
}
