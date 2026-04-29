import type { LastPick } from "@/lib/types";

interface Props {
  picks: LastPick[];
  limit?: number;
  size?: "sm" | "md";
}

const OUTCOME_STYLES = {
  W: "bg-[var(--color-pos-soft)] text-[var(--color-pos)] border-[rgba(25,245,124,0.25)]",
  L: "bg-[var(--color-neg-soft)] text-[var(--color-neg)] border-[rgba(239,68,68,0.25)]",
  P: "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] border-[rgba(255,255,255,0.10)]",
} as const;

export function RecentPicks({ picks, limit = 3, size = "sm" }: Props) {
  const visible = picks.slice(0, limit);
  if (visible.length === 0) {
    return (
      <span className="text-[11px] italic text-[var(--color-text-muted)]">No graded picks yet</span>
    );
  }

  const rowText = size === "md" ? "text-[12px]" : "text-[11px]";
  const gap = size === "md" ? "gap-1.5" : "gap-1";

  return (
    <ul className={`flex flex-col ${gap} w-full`}>
      {visible.map((pick, i) => (
        <li key={i} className={`flex items-center justify-between gap-2 ${rowText} font-medium`}>
          <span className="flex-1 min-w-0 flex items-baseline gap-1.5 truncate">
            {pick.kind === "parlay" ? renderParlay(pick) : renderStraight(pick)}
          </span>
          <span
            className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded
                        text-[10px] font-extrabold border ${OUTCOME_STYLES[pick.outcome]}`}
          >
            {pick.outcome}
          </span>
        </li>
      ))}
    </ul>
  );
}

function renderStraight(pick: LastPick) {
  return (
    <>
      <span className="text-[var(--color-text-muted)] truncate">
        {pick.game_label ?? "Game"}
      </span>
      <span className="opacity-30 shrink-0">·</span>
      <span className="text-[var(--color-text-soft)] truncate">
        {formatBet(pick)}
      </span>
    </>
  );
}

function renderParlay(pick: LastPick) {
  const legLabel = pick.leg_count ? `${pick.leg_count}-leg parlay` : "Parlay";
  const profit = pick.profit_units;
  return (
    <>
      <span className="text-[var(--color-gold)] truncate font-semibold">
        {legLabel}
      </span>
      {profit != null && (
        <>
          <span className="opacity-30 shrink-0">·</span>
          <span
            className={`truncate tabular-nums font-semibold ${
              profit >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
            }`}
          >
            {profit >= 0 ? "+" : ""}{profit.toFixed(1)}u
          </span>
        </>
      )}
    </>
  );
}

function formatBet(pick: LastPick): string {
  const parts: string[] = [];
  if (pick.selection) parts.push(pick.selection);
  if (pick.line != null) parts.push(String(pick.line));
  if (pick.odds_taken != null) {
    const sign = pick.odds_taken > 0 ? "+" : "";
    parts.push(`${sign}${pick.odds_taken}`);
  }
  return parts.join(" ") || pick.market || "Pick";
}
