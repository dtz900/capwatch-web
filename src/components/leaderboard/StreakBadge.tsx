import type { CSSProperties } from "react";

type Tier = {
  label: string;
  icon: string;
  tone: "hot" | "cold";
};

/**
 * Map a signed day-streak to its badge tier. Positive = consecutive profitable
 * settle-days, negative = consecutive losing days. Under 2 in a row shows no
 * badge.
 *   2 days  -> heating up / cooled off
 *   3 to 4  -> on fire    / ice cold
 *   5+      -> god mode    / freezing
 */
function streakTier(streak: number): Tier | null {
  const n = Math.abs(streak);
  if (n < 2) return null;
  const hot = streak > 0;
  if (n >= 5) {
    return hot
      ? { label: "god mode", icon: "/streak/god-mode.png", tone: "hot" }
      : { label: "freezing", icon: "/streak/freezing.png", tone: "cold" };
  }
  if (n >= 3) {
    return hot
      ? { label: "on fire", icon: "/streak/on-fire.png", tone: "hot" }
      : { label: "ice cold", icon: "/streak/ice-cold.png", tone: "cold" };
  }
  return hot
    ? { label: "heating up", icon: "/streak/heating-up.png", tone: "hot" }
    : { label: "cooled off", icon: "/streak/cooled-off.png", tone: "cold" };
}

const TONE = {
  hot: { label: "#fb923c", glow: "rgba(249,115,22,0.50)" },
  cold: { label: "#7dd3fc", glow: "rgba(125,211,252,0.50)" },
} as const;

interface Props {
  streak?: number | null;
  size?: "xs" | "sm" | "md";
}

const DIM = { xs: 24, sm: 32, md: 44 } as const;

/**
 * Hot/cold day-streak badge. The icon carries the heat/cold and breathes with a
 * tonal glow (see .streak-icon in globals.css); the label is colored to match.
 * No background chip, so transparent icons read clean against the row. Renders
 * nothing when the capper is not on a 2+ day run.
 */
export function StreakBadge({ streak, size = "sm" }: Props) {
  const value = streak ?? 0;
  const tier = streakTier(value);
  if (!tier) return null;

  const tone = TONE[tier.tone];
  const dim = DIM[size];
  const text = size === "md" ? "text-[12px]" : "text-[11px]";
  const days = Math.abs(value);
  const title = `${days} ${tier.tone === "hot" ? "profitable" : "losing"} days in a row`;

  const iconStyle = {
    width: dim,
    height: dim,
    "--streak-glow": tone.glow,
  } as CSSProperties;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 shrink-0 ${text} font-extrabold uppercase tracking-[0.06em] whitespace-nowrap leading-none`}
      style={{ color: tone.label }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tier.icon} alt="" className="streak-icon shrink-0" style={iconStyle} />
      {/* xs (slate standings rows) is icon-only on mobile: the row has no room
          for handle + count, and the tooltip still carries the number. */}
      <span className={size === "xs" ? "hidden sm:inline" : ""}>
        {/* On the dense desktop rows show just the day count; mobile and the
            podium (size md) have room for the full label. xs is dense at every
            width, so it never shows the label. */}
        <span className={size === "sm" ? "sm:hidden" : size === "xs" ? "hidden" : ""}>
          {tier.label}
          <span className="opacity-50"> · </span>
        </span>
        {days}d
      </span>
    </span>
  );
}
