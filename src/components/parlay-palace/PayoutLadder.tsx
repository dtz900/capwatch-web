import type { PalaceLeg } from "@/lib/types";

function dec(odds: number | null): number {
  if (odds == null || odds === 0) return 1;
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

function fmt(v: number): string {
  return v >= 10 ? v.toFixed(0) : v.toFixed(1);
}

export function PayoutLadder({ legs }: { legs: PalaceLeg[] }) {
  if (legs.length === 0) return null;
  let acc = 1;
  const steps = legs.map((l, i) => {
    acc *= dec(l.odds_taken);
    return { i, value: acc };
  });
  const max = steps[steps.length - 1].value;
  const final = `${max.toFixed(2)}u`;

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

      {/* equal columns; bars share a baseline via flex-end + % heights */}
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
