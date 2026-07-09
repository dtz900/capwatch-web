import type { LastPick } from "@/lib/types";

export function MomentumStrip({ picks }: { picks: LastPick[] }) {
  if (!picks?.length) return null;
  const segments = [...picks].reverse();
  return (
    <div className="relative flex flex-col gap-1.5 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] font-bold">
          Momentum
        </span>
        <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] opacity-60">
          oldest → newest
        </span>
      </div>
      <div className="flex gap-[3px] h-[6px]">
        {segments.map((p, i) => {
          const color =
            p.outcome === "W" ? "bg-[var(--color-pos)]" :
            p.outcome === "L" ? "bg-[var(--color-neg)]" :
                                "bg-[rgba(255,255,255,0.10)]";
          return <span key={i} className={`flex-1 ${color} rounded-full`} title={p.outcome} />;
        })}
      </div>
    </div>
  );
}
