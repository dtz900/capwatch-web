import type { PalaceLeg } from "@/lib/types";

function fmt(v: number): string {
  return v >= 10 ? v.toFixed(0) : v.toFixed(1);
}

// Growth curve from 1u to the parlay's actual result (the hero number).
// Anchored to finalUnits rather than per-leg odds: per-leg odds are often
// missing (many cappers only post combined odds), which previously collapsed
// the ladder to a flat 1.00u. A geometric ramp always tells the real story
// and stays consistent with the hero.
export function PayoutLadder({
  legs,
  finalUnits,
}: {
  legs: PalaceLeg[];
  finalUnits: number;
}) {
  const n = legs.length;
  if (n === 0 || !Number.isFinite(finalUnits) || finalUnits <= 1) return null;

  const steps = Array.from({ length: n }, (_, i) => ({
    i,
    value: Math.pow(finalUnits, (i + 1) / n),
  }));
  const max = finalUnits;
  const final = `${finalUnits.toFixed(2)}u`;

  return (
    <div className="px-5 pt-5 pb-6 border-t border-[rgba(255,255,255,0.06)]">
      <div className="flex items-baseline justify-between mb-6">
        <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-[rgba(255,255,255,0.42)]">
          1u grew to
        </span>
        <span className="text-[16px] font-black tabular-nums text-[#e3c787]">
          {final}
        </span>
      </div>

      <div className="flex items-end gap-2.5 h-[84px]">
        {steps.map((s) => {
          const pct = Math.max(12, Math.round((s.value / max) * 100));
          const last = s.i === steps.length - 1;
          return (
            <div
              key={s.i}
              className="flex-1 flex flex-col justify-end items-center h-full"
            >
              <span
                className={`mb-1.5 text-[10px] font-bold tabular-nums leading-none ${
                  last ? "text-[#e3c787]" : "text-[rgba(255,255,255,0.45)]"
                }`}
              >
                {fmt(s.value)}
              </span>
              <div
                className="w-full rounded-[3px]"
                style={{
                  height: `${pct}%`,
                  background: last
                    ? "linear-gradient(180deg,#f0d79a,#c7a259)"
                    : "linear-gradient(180deg,rgba(227,199,135,0.5),rgba(199,162,89,0.22))",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2.5 mt-2">
        {steps.map((s) => (
          <span
            key={s.i}
            className="flex-1 text-center text-[9px] font-bold uppercase tracking-wide text-[rgba(255,255,255,0.3)]"
          >
            L{s.i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
