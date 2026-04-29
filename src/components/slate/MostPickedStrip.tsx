import type { SlateMostPicked } from "@/lib/types";

export function MostPickedStrip({ items }: { items: SlateMostPicked[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4 mb-6">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-3">
        Most picked today
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((g) => {
          const matchup =
            g.away_team && g.home_team ? `${g.away_team} @ ${g.home_team}` : `Game ${g.game_id}`;
          return (
            <a
              key={g.game_id}
              href={`#game-${g.game_id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg
                         bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors
                         border border-[rgba(255,255,255,0.04)]"
            >
              <span className="text-[12px] font-bold text-[var(--color-text)]">{matchup}</span>
              <span
                className="text-[10px] uppercase tracking-[0.12em] font-bold
                                 text-[var(--color-gold)] opacity-90"
              >
                {g.pick_count} picks
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
