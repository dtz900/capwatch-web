import { inferMarketBucket } from "@/lib/bet-format";
import type { SlatePick } from "@/lib/types";

interface ChipStyle {
  label: string;
  bg: string;
  fg: string;
}

const CHIP_STYLE: Record<string, ChipStyle> = {
  Moneyline: { label: "ML", bg: "rgba(96,165,250,0.14)", fg: "#7eb0ff" },
  Spread: { label: "RL", bg: "rgba(244,114,182,0.14)", fg: "#f472b6" },
  Total: { label: "TOT", bg: "rgba(168,139,250,0.14)", fg: "#c4b5fd" },
  "Player prop": { label: "PROP", bg: "rgba(212,168,83,0.14)", fg: "var(--color-gold)" },
  "Game prop": { label: "GP", bg: "rgba(74,222,128,0.14)", fg: "#86efac" },
  Parlay: { label: "PAR", bg: "rgba(212,168,83,0.14)", fg: "var(--color-gold)" },
};

const ORDER = ["Moneyline", "Spread", "Total", "Player prop", "Game prop", "Parlay"];

export function PickMixBar({ picks }: { picks: SlatePick[] }) {
  if (picks.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const p of picks) {
    if (p.kind === "parlay_leg" && (p.leg_count ?? 0) > 1) {
      counts.Parlay = (counts.Parlay ?? 0) + 1;
      continue;
    }
    const bucket = inferMarketBucket(p.market, p.selection);
    if (!bucket) continue;
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }

  const entries = ORDER
    .map((bucket) => ({ bucket, count: counts[bucket] ?? 0 }))
    .filter((e) => e.count > 0);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
      {entries.map(({ bucket, count }) => {
        const style = CHIP_STYLE[bucket];
        if (!style) return null;
        return (
          <span
            key={bucket}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-[0.06em] tabular-nums"
            style={{ backgroundColor: style.bg, color: style.fg }}
          >
            <span>{count}</span>
            <span className="opacity-90">{style.label}</span>
          </span>
        );
      })}
    </div>
  );
}
