import type { PalaceEntry } from "@/lib/types";
import { formatUnits2 } from "@/lib/formatters";

export function ParlayHero({ entry }: { entry: PalaceEntry }) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-[rgba(25,245,124,0.18)]">
      <div className="relative min-h-[280px] flex flex-col justify-end bg-[linear-gradient(125deg,#1d3a2b,#0c0f0d)]">
        {entry.hero_url && entry.hero_kind === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.hero_url} alt=""
               className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        {entry.hero_url && entry.hero_kind === "clip" ? (
          <video src={entry.hero_url} controls playsInline
                 className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        <div className="relative p-5 bg-[linear-gradient(transparent,rgba(10,10,12,0.9))]">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-pos)] font-bold">
            Parlay Palace · {entry.slate_date}
          </div>
          <div className="text-[var(--color-pos)] font-extrabold text-[48px] leading-none tabular-nums mt-3">
            {formatUnits2(entry.units_profit ?? 0)}
            <span className="text-[18px] opacity-70">u</span>
          </div>
          <div className="text-[14px] font-bold text-[var(--color-text)] mt-2">
            {entry.leg_count}-leg parlay{" "}
            <span className="text-[var(--color-text-muted)] font-medium">
              · +{entry.combined_odds} · @{entry.capper_handle}
            </span>
          </div>
        </div>
      </div>
      <div className="px-5 py-2 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-card)]">
        {entry.body?.media_attribution ?? "Media: MLB Advanced Media"}
      </div>
    </div>
  );
}
