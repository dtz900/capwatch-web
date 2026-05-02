import { inferMarketBucket } from "@/lib/bet-format";
import type { SlatePick } from "@/lib/types";

const ORDER = ["Moneyline", "Spread", "Total", "Player prop", "Game prop", "Parlay"];

const SINGULAR: Record<string, string> = {
  Moneyline: "moneyline",
  Spread: "spread",
  Total: "total",
  "Player prop": "player prop",
  "Game prop": "game prop",
  Parlay: "parlay leg",
};
const PLURAL: Record<string, string> = {
  Moneyline: "moneylines",
  Spread: "spreads",
  Total: "totals",
  "Player prop": "player props",
  "Game prop": "game props",
  Parlay: "parlay legs",
};

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

  const parts = ORDER
    .map((bucket) => ({ bucket, count: counts[bucket] ?? 0 }))
    .filter((e) => e.count > 0)
    .map(({ bucket, count }) => `${count} ${count === 1 ? SINGULAR[bucket] : PLURAL[bucket]}`);

  if (parts.length === 0) return null;

  return (
    <p className="text-[12px] text-[var(--color-text-muted)] font-medium tabular-nums mt-1.5">
      {parts.join(" · ")}
    </p>
  );
}
