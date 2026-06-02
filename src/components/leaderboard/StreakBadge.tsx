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

interface Props {
  streak?: number | null;
  size?: "sm" | "md";
}

/**
 * Hot/cold day-streak badge for the leaderboard. Renders the tier icon plus its
 * label ("on fire", "ice cold", ...) in a flat chip. The icon carries the
 * warm/cold color so the label stays on the off-white palette. Renders nothing
 * when the capper is not on a 2+ day run.
 */
export function StreakBadge({ streak, size = "sm" }: Props) {
  const value = streak ?? 0;
  const tier = streakTier(value);
  if (!tier) return null;

  const dim = size === "md" ? 22 : 18;
  const text = size === "md" ? "text-[11px]" : "text-[10px]";
  const days = Math.abs(value);
  const title = `${days} ${tier.tone === "hot" ? "profitable" : "losing"} days in a row`;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 ${text} font-bold uppercase tracking-[0.05em] text-[var(--color-text-soft)] whitespace-nowrap leading-none`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tier.icon}
        alt=""
        width={dim}
        height={dim}
        style={{ width: dim, height: dim }}
        className="shrink-0"
      />
      <span>{tier.label}</span>
    </span>
  );
}
