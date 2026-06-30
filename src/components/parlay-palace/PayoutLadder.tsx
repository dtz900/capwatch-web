import type { PalaceLeg } from "@/lib/types";

function fmt(v: number): string {
  return v >= 10 ? v.toFixed(0) : v.toFixed(1);
}

// Growth curve from 1u to the parlay's actual result (the hero number).
// Anchored to finalUnits rather than per-leg odds: per-leg odds are often
// missing (many cappers only post combined odds), which previously collapsed
// the ladder to a flat 1.00u. A geometric ramp always tells the real story
// and stays consistent with the hero.
//
// Voided/pushed legs dropped out of the parlay and did NOT grow the payout,
// so they are excluded from the ramp (otherwise the curve spreads the growth
// across a leg that never counted). Each surviving rung keeps its real leg
// position so the bars still line up with the rows above; a voided leg's rung
// is simply absent.
export function PayoutLadder({
  legs,
  finalUnits,
}: {
  legs: PalaceLeg[];
  finalUnits: number;
}) {
  const active = legs
    .map((l, idx) => ({ position: idx + 1, oc: (l.outcome ?? "").toLowerCase() }))
    .filter((l) => l.oc !== "void" && l.oc !== "push");
  const n = active.length;
  if (n === 0 || !Number.isFinite(finalUnits) || finalUnits <= 1) return null;

  const steps = active.map((l, i) => ({
    position: l.position,
    last: i === n - 1,
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
          const last = s.last;
          return (
            <div
              key={s.position}
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
            key={s.position}
            className="flex-1 text-center text-[9px] font-bold uppercase tracking-wide text-[rgba(255,255,255,0.3)]"
          >
            L{s.position}
          </span>
        ))}
      </div>
    </div>
  );
}
