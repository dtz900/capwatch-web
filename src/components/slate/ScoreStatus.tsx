import type { InningHalf } from "@/lib/types";
import { teamColor } from "@/lib/mlb-teams";

export type ScoreStatusState = "pre" | "live" | "final_pending" | "final_graded";

interface Props {
  state: ScoreStatusState;
  awayTeam: string | null;
  homeTeam: string | null;
  awayScore: number | null;
  homeScore: number | null;
  inning: number | null;
  inningHalf: InningHalf | null;
  gameTime: string | null;
}

const HALF_LABEL: Record<InningHalf, string> = {
  top: "TOP",
  bot: "BOT",
  mid: "MID",
  end: "END",
};

function formatGameTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const t = new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
    return `${t} ET`;
  } catch {
    return null;
  }
}

function Pill({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "live" | "final" | "grading" | "neutral";
}) {
  const palette =
    variant === "live"
      ? "bg-[var(--color-pos-soft)] text-[var(--color-pos)] ring-[rgba(25,245,124,0.25)]"
      : variant === "grading"
      ? "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] ring-[rgba(255,255,255,0.10)] italic normal-case tracking-wider"
      : variant === "final"
      ? "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] ring-[rgba(255,255,255,0.14)]"
      : "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] ring-[rgba(255,255,255,0.08)]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] font-bold ring-1 ring-inset whitespace-nowrap ${palette}`}
    >
      {children}
    </span>
  );
}

function ScoreNumber({ value, color }: { value: number | null; color: string }) {
  return (
    <span
      className="text-[44px] sm:text-[56px] font-extrabold leading-none tracking-tight tabular-nums"
      style={{ color }}
    >
      {value ?? "—"}
    </span>
  );
}

export function ScoreStatus({
  state,
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  inning,
  inningHalf,
  gameTime,
}: Props) {
  if (state === "pre") {
    const time = formatGameTime(gameTime);
    return (
      <div className="flex justify-center">
        <Pill variant="neutral">{time ?? ""}</Pill>
      </div>
    );
  }

  const awayColor = teamColor(awayTeam);
  const homeColor = teamColor(homeTeam);
  const halfLabel = inningHalf ? HALF_LABEL[inningHalf] : null;

  let statusChip: React.ReactNode = null;
  if (state === "live") {
    statusChip = (
      <Pill variant="live">
        <span
          className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
          aria-hidden
        />
        {halfLabel && inning !== null ? `${halfLabel} ${inning}` : "LIVE"}
      </Pill>
    );
  } else if (state === "final_pending") {
    statusChip = (
      <div className="flex items-center gap-1.5">
        <Pill variant="final">FINAL</Pill>
        <Pill variant="grading">grading…</Pill>
      </div>
    );
  } else {
    statusChip = <Pill variant="final">FINAL</Pill>;
  }

  return (
    <div className="flex items-center justify-center gap-5 sm:gap-8">
      <ScoreNumber value={awayScore} color={awayColor} />
      <div className="flex flex-col items-center justify-center gap-1.5 min-w-[80px]">
        {statusChip}
      </div>
      <ScoreNumber value={homeScore} color={homeColor} />
    </div>
  );
}
