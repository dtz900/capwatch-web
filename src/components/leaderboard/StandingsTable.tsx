import { StandingsRow } from "./StandingsRow";
import type { CapperRow } from "@/lib/types";

interface Props { rows: CapperRow[]; startRank: number }

export function StandingsTable({ rows, startRank }: Props) {
  return (
    <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl mb-9">
      <div className="grid grid-cols-[40px_minmax(180px,1fr)_minmax(280px,1.6fr)_64px_64px_70px_80px_44px] items-center gap-3
                      px-[22px] py-3.5 text-[10px] font-bold uppercase tracking-[0.12em]
                      text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
        <div>Rank</div>
        <div>Capper</div>
        <div>Recent picks</div>
        <div className="text-right">Picks</div>
        <div className="text-right">Win %</div>
        <div className="text-right">Units</div>
        <div className="text-right">ROI</div>
        <div></div>
      </div>
      {rows.map((r, i) => (
        <StandingsRow key={r.capper_id} rank={startRank + i} capper={r} />
      ))}
    </section>
  );
}
