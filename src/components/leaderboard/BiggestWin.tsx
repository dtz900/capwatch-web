import { formatUnits } from "@/lib/formatters";
import type { BiggestWin as BWType } from "@/lib/types";

interface Props {
  win: BWType | null;
}

export function BiggestWin({ win }: Props) {
  if (!win) return null;
  const odds = win.odds_taken == null ? "" : ` ${win.odds_taken > 0 ? "+" : ""}${win.odds_taken}`;
  const lineLabel = win.line == null ? "" : ` ${win.line}`;
  const dateLabel = win.game_date ? ` · ${formatGameDate(win.game_date)}` : "";

  return (
    <div className="bg-[var(--color-pos-soft)] border border-[rgba(25,245,124,0.18)]
                    rounded-lg px-3 py-2.5 flex flex-col gap-0.5">
      <div className="text-[11px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold">
        Biggest win
      </div>
      <div className="text-[13px] font-bold">
        <span className="text-[var(--color-pos)] font-extrabold mr-1.5">
          {formatUnits(win.units)}u
        </span>
        {win.selection}{lineLabel}{odds}
        {win.game_label ? ` · ${win.game_label}` : ""}{dateLabel}
      </div>
    </div>
  );
}

function formatGameDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
