import Link from "next/link";
import type { PalaceEntry } from "@/lib/types";
import { formatUnits } from "@/lib/formatters";

export function PalaceCard({ entry }: { entry: PalaceEntry }) {
  return (
    <Link
      href={`/parlay-palace/${entry.slug}`}
      className="block rounded-lg overflow-hidden border border-[rgba(25,245,124,0.18)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-h)] transition-colors"
    >
      <div className="relative h-40 bg-[linear-gradient(125deg,#1d3a2b,#0c0f0d)]">
        {entry.hero_url && entry.hero_kind !== "clip" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.hero_url} alt="" className="w-full h-40 object-cover" />
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-[linear-gradient(transparent,rgba(10,10,12,0.85))]">
          <div className="text-[var(--color-pos)] font-extrabold text-[26px] leading-none tabular-nums">
            {formatUnits(entry.units_profit ?? 0)}
            <span className="text-[13px] opacity-70">u</span>
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="text-[13px] font-bold text-[var(--color-text)]">
          @{entry.capper_handle}
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
          {entry.leg_count}-leg · +{entry.combined_odds} · {entry.slate_date}
        </div>
      </div>
    </Link>
  );
}
