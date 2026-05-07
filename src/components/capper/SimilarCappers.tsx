import Link from "next/link";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { formatRoi, formatUnits, formatWinRate } from "@/lib/formatters";
import type { CapperRow } from "@/lib/types";

interface SimilarCappersProps {
  rows: CapperRow[];
  currentHandle: string;
}

/**
 * Internal-linking section at the bottom of the capper profile. Surfaces a
 * handful of other tracked cappers so PageRank flows across profiles and
 * visitors who land on a long-tail capper-name search have a path to keep
 * exploring TailSlips. Six top performers, current capper excluded.
 */
export function SimilarCappers({ rows, currentHandle }: SimilarCappersProps) {
  const others = rows
    .filter((r) => r.handle && r.handle !== currentHandle)
    .slice(0, 6);
  if (others.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-[var(--color-border)]">
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
        <h2 className="text-[14px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          Other tracked cappers
        </h2>
        <Link
          href="/cappers"
          className="text-[12px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text)] transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {others.map((c) => (
          <SimilarCapperCard key={c.capper_id} capper={c} />
        ))}
      </div>
    </section>
  );
}

function SimilarCapperCard({ capper: c }: { capper: CapperRow }) {
  const isModel = c.handle === "fadeai_";
  const unitsCls = c.units_profit >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  const roiCls = c.roi_pct >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]";
  return (
    <Link
      href={`/cappers/${c.handle}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-h)] transition-colors"
    >
      <CapperAvatar url={c.profile_image_url} handle={c.handle} size={40} apiIntegrated={isModel} />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-[14px] truncate text-[var(--color-text)] tracking-[-0.01em]">
          {c.display_name ?? c.handle}
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] font-medium truncate">
          @{c.handle} · {c.picks_count} picks · {formatWinRate(c.win_rate)}
        </div>
      </div>
      <div className="text-right tabular-nums shrink-0">
        <div className={`text-[13px] font-bold ${unitsCls}`}>{formatUnits(c.units_profit)}u</div>
        <div className={`text-[11px] font-semibold ${roiCls}`}>{formatRoi(c.roi_pct)}</div>
      </div>
    </Link>
  );
}
