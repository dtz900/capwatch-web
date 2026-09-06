"use client";

/**
 * League chip row (the sportsbook "NBA | NFL | MLB" pattern): official league
 * marks in a compact chip strip, the active chip filled, the rest muted and
 * greyscale. Pure presentation; the caller owns the URL.
 */
export type LeagueChip = {
  value: string;
  label: string;
  /** "mlb" | "nfl" draw that league's mark; "all" draws both, small. */
  league: "mlb" | "nfl" | "all";
  caption?: string;
};

const MARK: Record<"mlb" | "nfl", string> = {
  mlb: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  nfl: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",
};

function Mark({ league, h, muted }: { league: "mlb" | "nfl"; h: number; muted: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={MARK[league]}
      alt=""
      aria-hidden
      height={h}
      style={{ height: h, width: "auto" }}
      className={`shrink-0 object-contain transition-[filter,opacity] duration-200 ${
        muted ? "grayscale opacity-55" : "opacity-100"
      }`}
    />
  );
}

export function LeagueChips({
  chips,
  value,
  onChange,
  size = "md",
  ariaLabel = "Sport",
  busy = false,
}: {
  chips: LeagueChip[];
  value: string;
  onChange: (value: string) => void;
  size?: "md" | "lg";
  ariaLabel?: string;
  busy?: boolean;
}) {
  const lg = size === "lg";
  const markH = lg ? 26 : 18;
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-busy={busy}
      className={`flex items-stretch gap-2 transition-opacity duration-150 ${busy ? "opacity-70" : "opacity-100"}`}
    >
      {chips.map((c) => {
        const active = c.value === value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c.value)}
            className={`group flex flex-col items-center justify-center rounded-lg border select-none
                        ${lg ? "px-5 py-3 min-w-[128px] sm:min-w-[150px]" : "px-3.5 py-2"}
                        transition-colors duration-150 ${
              active
                ? "bg-[#f7f3e9] border-[#f7f3e9] text-black shadow-[0_6px_18px_-8px_rgba(247,243,233,0.55)]"
                : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[rgba(255,255,255,0.16)]"
            }`}
          >
            <span className={`flex items-center ${lg ? "gap-3" : "gap-2"}`}>
              {c.league === "all" ? (
                <span className="flex items-center gap-1">
                  <Mark league="mlb" h={Math.round(markH * 0.8)} muted={!active} />
                  <Mark league="nfl" h={Math.round(markH * 0.8)} muted={!active} />
                </span>
              ) : (
                <Mark league={c.league} h={markH} muted={!active} />
              )}
              <span
                className={`font-extrabold tracking-[-0.01em] leading-none ${
                  lg ? "text-[20px] sm:text-[22px]" : "text-[13px] sm:text-[14px]"
                }`}
              >
                {c.label}
              </span>
            </span>
            {c.caption && (
              <span
                className={`mt-1.5 text-[10px] uppercase tracking-[0.18em] font-bold leading-none ${
                  active ? "text-black/60" : "text-[var(--color-text-muted)] opacity-80"
                }`}
              >
                {c.caption}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
