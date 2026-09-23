"use client";
import type { TofBoardRow, TofStats } from "@/lib/types";
import { unitsLabel } from "@/lib/tof/deck";
import { StreakBadge } from "@/components/leaderboard/StreakBadge";

const RANK_COLOR = ["#f5c54a", "#d4d4d8", "#c8814a"];

export function TofBoard({ rows, me, minPlays }: { rows: TofBoardRow[]; me: { username: string; stats: TofStats } | null; minPlays: number }) {
  const meOnBoard = me ? rows.some((r) => r.username === me.username) : false;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Tailers · this month</div>
        <div className="text-[10px] font-bold text-[#52525b]">min {minPlays} plays</div>
      </div>
      {rows.length === 0 ? (
        <div className="mt-3 text-[12px] text-[var(--color-text-muted)]">Nobody has {minPlays} graded plays yet. Be first.</div>
      ) : (
        <div className="mt-2 flex flex-col">
          {rows.map((r, i) => (
            <div key={r.username} className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.05)] py-2 text-[12px]">
              <span className="w-5 font-extrabold" style={{ color: RANK_COLOR[i] ?? "var(--color-text-muted)" }}>{r.rank}</span>
              <span className="min-w-0 flex-grow truncate font-bold">{r.username}</span>
              <StreakBadge streak={r.day_streak} size="xs" />
              <span className="text-[var(--color-text-soft)] tabular-nums">{r.wins}-{r.losses}</span>
              <span className={`w-16 text-right font-extrabold tabular-nums ${r.units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}>{unitsLabel(r.units)}</span>
            </div>
          ))}
        </div>
      )}
      {me && !meOnBoard && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-[rgba(25,245,124,0.2)] bg-[rgba(25,245,124,0.06)] px-2.5 py-2 text-[12px]">
          <span className="w-5 font-extrabold text-[var(--color-text-muted)]">you</span>
          <span className="min-w-0 flex-grow truncate font-extrabold">{me.username}</span>
          <StreakBadge streak={me.stats.day_streak} size="xs" />
          <span className="text-[var(--color-text-soft)] tabular-nums">{me.stats.wins}-{me.stats.losses}</span>
          <span className={`w-16 text-right font-extrabold tabular-nums ${me.stats.units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}>{unitsLabel(me.stats.units)}</span>
        </div>
      )}
    </div>
  );
}
