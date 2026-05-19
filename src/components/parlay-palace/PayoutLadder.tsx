import type { PalaceLeg } from "@/lib/types";

function dec(odds: number | null): number {
  if (odds == null || odds === 0) return 1;
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

export function PayoutLadder({ legs }: { legs: PalaceLeg[] }) {
  if (legs.length === 0) return null;
  let acc = 1;
  const steps = legs.map((l, i) => {
    acc *= dec(l.odds_taken);
    return { i, label: `${acc.toFixed(2)}u` };
  });
  return (
    <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold mb-3">
        How 1u became {steps[steps.length - 1].label}
      </div>
      <div className="flex items-end gap-1.5 overflow-x-auto no-scrollbar">
        {steps.map((s) => {
          const max = parseFloat(steps[steps.length - 1].label);
          const cur = parseFloat(s.label);
          const h = Math.max(8, Math.round((cur / max) * 56));
          return (
            <div key={s.i} className="flex flex-col items-center gap-1 shrink-0">
              <div className="text-[10px] font-bold text-[var(--color-pos)] tabular-nums">
                {s.label}
              </div>
              <div
                className="w-7 rounded-sm bg-[var(--color-pos)] opacity-80"
                style={{ height: `${h}px` }}
              />
              <div className="text-[9px] text-[var(--color-text-muted)]">
                L{s.i + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
