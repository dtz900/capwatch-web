"use client";

/**
 * League row (the sportsbook "NBA | NFL | MLB" pattern): official league
 * marks with labels in a bare row. Only the selected item gets the filled
 * pill; the rest are plain muted text with a greyscale mark and no chrome.
 * Pure presentation; the caller owns the URL.
 */
export type LeagueChip = {
  value: string;
  label: string;
  /** "mlb" | "nfl" | "nba" draw that league's mark; "all" is text only. */
  league: League | "all";
  caption?: string;
  /** Pulse a dot by the caption: this board has something to look at right now. */
  signal?: boolean;
};

type League = "mlb" | "nfl" | "nba";

const MARK: Record<League, string> = {
  mlb: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  nfl: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",
  nba: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
};

function Mark({ league, h, sizeClass, muted }: { league: League; h: number; sizeClass: string; muted: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={MARK[league]}
      alt=""
      aria-hidden
      height={h}
      style={{ width: "auto" }}
      className={`shrink-0 object-contain transition-[filter,opacity] duration-200 ${sizeClass} ${
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
  const markH = lg ? 32 : 24;
  // Three large chips have to fit a 375px phone inside the 16px gutters, so
  // the lg size steps down below sm and returns to the full treatment above.
  const markClass = lg ? "h-[26px] sm:h-[32px]" : "h-[24px]";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-busy={busy}
      className={`flex items-stretch ${lg ? "gap-2 sm:gap-3" : "gap-1.5"} transition-opacity duration-150 ${busy ? "opacity-70" : "opacity-100"}`}
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
            className={`group flex flex-col items-center justify-center rounded-lg select-none
                        ${lg ? "px-2 sm:px-5 py-3 min-w-[96px] sm:min-w-[140px]" : "px-3.5 py-2"}
                        transition-colors duration-150 ${
              active
                ? "bg-[#f7f3e9] text-black shadow-[0_6px_18px_-8px_rgba(247,243,233,0.55)]"
                : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <span className={`flex items-center ${lg ? "gap-2 sm:gap-3" : "gap-2"}`}>
              {c.league !== "all" && <Mark league={c.league} h={markH} sizeClass={markClass} muted={!active} />}
              <span
                className={`font-extrabold tracking-[-0.01em] leading-none ${
                  lg ? "text-[18px] sm:text-[22px]" : "text-[13px] sm:text-[14px]"
                }`}
              >
                {c.label}
              </span>
            </span>
            {c.caption && (
              <span
                className={`mt-1.5 flex items-center gap-1.5 uppercase font-bold leading-none whitespace-nowrap ${
                  lg ? "text-[9px] tracking-[0.12em] sm:text-[10px] sm:tracking-[0.18em]" : "text-[10px] tracking-[0.18em]"
                } ${
                  active
                    ? "text-black/60"
                    : c.signal
                      ? "text-[var(--color-text)] opacity-90"
                      : "text-[var(--color-text-muted)] opacity-80"
                }`}
              >
                {c.signal && !active && (
                  <span
                    data-signal
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] shadow-[0_0_0_3px_var(--color-pos-soft)] animate-pulse motion-reduce:animate-none"
                  />
                )}
                {c.caption}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
