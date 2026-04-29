import { formatUnits } from "@/lib/formatters";
import type { BiggestWin as BWType } from "@/lib/types";
import { XIcon } from "@/components/icons/XIcon";

type AccentVar = "gold" | "silver" | "bronze";

interface Props {
  win: BWType | null;
  accent?: AccentVar;
}

const STRIPE: Record<AccentVar, string> = {
  gold: "bg-[var(--color-gold)]",
  silver: "bg-[var(--color-silver)]",
  bronze: "bg-[var(--color-bronze)]",
};

export function BiggestWin({ win, accent = "gold" }: Props) {
  if (!win) return null;

  const odds =
    win.odds_taken == null
      ? null
      : `${win.odds_taken > 0 ? "+" : ""}${win.odds_taken}`;
  const lineLabel = win.line == null ? null : `${win.line}`;
  const dateLabel = win.game_date ? formatGameDate(win.game_date) : null;

  const receiptParts: string[] = [];
  if (win.selection) receiptParts.push(win.selection);
  else if (win.market) receiptParts.push(win.market);
  if (lineLabel) receiptParts.push(lineLabel);
  if (odds) receiptParts.push(odds);
  if (win.game_label) receiptParts.push(win.game_label);
  if (dateLabel) receiptParts.push(dateLabel);

  return (
    <div
      className="relative overflow-hidden rounded-lg
                 bg-gradient-to-br from-[rgba(25,245,124,0.06)] via-[rgba(255,255,255,0.02)] to-transparent
                 border border-[rgba(25,245,124,0.18)]
                 pl-4 pr-3 py-3"
    >
      {/* Left accent stripe in rank color */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${STRIPE[accent]}`}
      />

      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
          Biggest win
        </span>
        {win.tweet_url && (
          <a
            href={win.tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View biggest win on X"
            className="shrink-0 -mt-0.5 -mr-0.5 w-7 h-7 inline-flex items-center justify-center rounded-md
                       bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)]
                       hover:text-white hover:bg-[rgba(255,255,255,0.10)] transition-colors"
          >
            <XIcon size={11} glow />
          </a>
        )}
      </div>

      {/* Hero number */}
      <div className="text-[var(--color-pos)] font-extrabold tabular-nums leading-none tracking-[-0.03em] text-[28px] mb-2">
        {formatUnits(win.units)}
        <span className="text-[14px] font-bold opacity-70 ml-0.5">u</span>
      </div>

      {/* Receipt line */}
      {receiptParts.length > 0 && (
        <div className="text-[12px] text-[var(--color-text-soft)] font-medium leading-snug">
          {receiptParts.map((part, i) => (
            <span key={i}>
              {i > 0 && (
                <span className="text-[var(--color-text-muted)] mx-1.5 opacity-50">
                  ·
                </span>
              )}
              <span>{part}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatGameDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
