import type { InningHalf } from "@/lib/types";

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

function ScorePair({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
}: {
  awayTeam: string | null;
  homeTeam: string | null;
  awayScore: number | null;
  homeScore: number | null;
}) {
  if (awayScore === null || homeScore === null) return null;
  return (
    <span className="tabular-nums">
      <span>{awayTeam ?? "AWY"} {awayScore}</span>
      <span className="px-1 text-[var(--color-text-muted)]">·</span>
      <span>{homeTeam ?? "HME"} {homeScore}</span>
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
    return <span className="tabular-nums">{time ?? ""}</span>;
  }
  if (state === "live") {
    const halfLabel = inningHalf ? HALF_LABEL[inningHalf] : null;
    return (
      <span className="flex items-baseline gap-2">
        {halfLabel && inning !== null && (
          <span className="text-[var(--color-text-muted)]">{halfLabel} {inning}</span>
        )}
        <ScorePair
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          awayScore={awayScore}
          homeScore={homeScore}
        />
      </span>
    );
  }
  if (state === "final_pending") {
    return (
      <span className="flex items-baseline gap-2">
        <span>FINAL</span>
        <ScorePair
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          awayScore={awayScore}
          homeScore={homeScore}
        />
        <span className="text-[var(--color-text-muted)] italic normal-case tracking-normal">
          grading…
        </span>
      </span>
    );
  }
  // final_graded
  return (
    <span className="flex items-baseline gap-2">
      <span>FINAL</span>
      <ScorePair
        awayTeam={awayTeam}
        homeTeam={homeTeam}
        awayScore={awayScore}
        homeScore={homeScore}
      />
    </span>
  );
}
