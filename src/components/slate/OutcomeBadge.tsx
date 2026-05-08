import type { Outcome } from "@/lib/types";

const STYLES: Record<Outcome, { bg: string; border: string; color: string; label: string }> = {
  W: { bg: "rgba(94, 234, 212, 0.12)", border: "rgba(94, 234, 212, 0.45)", color: "#5eead4", label: "W" },
  L: { bg: "rgba(248, 113, 113, 0.10)", border: "rgba(248, 113, 113, 0.40)", color: "#f87171", label: "L" },
  P: { bg: "rgba(255, 255, 255, 0.06)", border: "rgba(255, 255, 255, 0.18)", color: "var(--color-text-soft)", label: "P" },
  V: { bg: "rgba(255, 255, 255, 0.04)", border: "rgba(255, 255, 255, 0.14)", color: "var(--color-text-muted)", label: "VOID" },
};

function formatProfit(units: number): string {
  const sign = units > 0 ? "+" : "";
  const abs = Math.abs(units);
  const fixed = abs >= 1 ? units.toFixed(units % 1 === 0 ? 0 : 2) : units.toFixed(2);
  return `${sign}${fixed}u`;
}

interface Props {
  outcome: Outcome;
  profitUnits: number | null;
}

export function OutcomeBadge({ outcome, profitUnits }: Props) {
  const style = STYLES[outcome];
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums whitespace-nowrap"
      style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.color }}
    >
      <span>{style.label}</span>
      {profitUnits !== null && outcome !== "V" && (
        <span className="font-bold opacity-90">{formatProfit(profitUnits)}</span>
      )}
    </span>
  );
}
