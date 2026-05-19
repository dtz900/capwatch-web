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
    return { i, value: acc, label: `${acc.toFixed(2)}u` };
  });
  const max = steps[steps.length - 1].value;
  const final = steps[steps.length - 1].label;

  return (
    <div className="px-5 pt-5 pb-6 border-t border-[rgba(255,255,255,0.06)]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-[rgba(255,255,255,0.42)]">
          1u grew to
        </span>
        <span className="text-[15px] font-black tabular-nums text-[#e3c787]">
          {final}
        </span>
      </div>
      <div className="flex items-end gap-2 h-[72px]">
        {steps.map((s) => {
          const h = Math.max(10, Math.round((s.value / max) * 64));
          const last = s.i === steps.length - 1;
          return (
            <div
              key={s.i}
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              <span
                className={`text-[9px] font-bold tabular-nums ${
                  last
                    ? "text-[#e3c787]"
                    : "text-[rgba(255,255,255,0.4)]"
                }`}
              >
                {s.value.toFixed(s.value >= 10 ? 0 : 1)}
              </span>
              <div
                className="w-full rounded-[3px]"
                style={{
                  height: `${h}px`,
                  background: last
                    ? "linear-gradient(180deg,#f0d79a,#c7a259)"
                    : "linear-gradient(180deg,rgba(227,199,135,0.55),rgba(199,162,89,0.28))",
                }}
              />
              <span className="text-[9px] font-bold uppercase tracking-wide text-[rgba(255,255,255,0.3)]">
                L{s.i + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
