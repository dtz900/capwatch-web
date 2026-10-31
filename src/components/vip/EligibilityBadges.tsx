"use client";

import { Tooltip } from "@/components/common/Tooltip";
import type { VipEligibility } from "@/lib/vip/types";
import { closedCopy, eligibleCopy, focalUnits } from "./format";

export const ELIGIBILITY_TOOLTIP =
  "Eligibility is recomputed nightly from the same record shown on this page.";

const LEAGUE_MARK: Record<string, string> = {
  MLB: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  NFL: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",
  NBA: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
};

/** League mark: full color when eligible, greyscale and dim when not
 *  (same treatment as the site's league chips). Falls back to the label. */
export function LeagueMark({
  sport,
  eligible,
  className = "h-[36px] sm:h-[44px]",
}: {
  sport: string;
  eligible: boolean;
  className?: string;
}) {
  const src = LEAGUE_MARK[sport.toUpperCase()];
  if (!src) {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-muted)]">
        {sport}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={sport}
      height={44}
      style={{ width: "auto" }}
      className={`${className} shrink-0 object-contain self-center ${eligible ? "" : "grayscale opacity-40"}`}
    />
  );
}

/** One sport on the stat line: league mark, units, picks. Selling sports read in
 *  off-white, the rest muted; nothing is red or green here. The spec's
 *  sentence lives on as the group's aria-label. */
export function EligibilityStat({ row, tile = false }: { row: VipEligibility; tile?: boolean }) {
  const label = row.eligible ? eligibleCopy(row) : closedCopy(row);
  const tone = row.eligible
    ? "text-[var(--color-text)]"
    : "text-[var(--color-text-muted)]";
  // Tile: a stacked cell under sm (three sports fit one phone row); a plain stat from sm up.
  const box = tile
    ? `flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg min-w-0 sm:flex-row sm:gap-3 sm:p-0 sm:rounded-none sm:bg-transparent ${
        row.eligible ? "bg-[rgba(255,255,255,0.06)]" : "bg-[rgba(255,255,255,0.025)]"
      }`
    : "flex items-center gap-3 min-w-0";
  return (
    <div
      role="group"
      aria-label={label}
      className={box}
    >
      <LeagueMark
        sport={String(row.sport)}
        eligible={row.eligible}
        className={tile ? "h-[30px] sm:h-[44px]" : undefined}
      />
      <span
        className={`${tile ? "text-[18px]" : "text-[24px]"} sm:text-[26px] leading-none font-extrabold tabular-nums tracking-[-0.02em] ${tone}`}
      >
        {focalUnits(row.units)}
      </span>
      <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
        {row.n_picks ?? 0} picks
      </span>
    </div>
  );
}

/** Per-sport stats on one line, selling sports first. */
export function EligibilityBadges({
  eligibility,
  tiles = false,
}: {
  eligibility: VipEligibility[];
  /** Phone layout as one row of tiles (seller dashboard). */
  tiles?: boolean;
}) {
  if (eligibility.length === 0) return null;
  const ordered = [...eligibility].sort(
    (a, b) => Number(b.eligible) - Number(a.eligible),
  );
  return (
    <div
      className={
        tiles
          ? "grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-9 sm:gap-y-4"
          : "flex flex-wrap items-center gap-x-9 gap-y-4"
      }
    >
      {ordered.map((row) => (
        <EligibilityStat key={row.sport} row={row} tile={tiles} />
      ))}
      <span className={tiles ? "col-span-3 sm:col-span-1" : undefined}>
        <Tooltip content={ELIGIBILITY_TOOLTIP}>
          <span className="cursor-help text-[11px] text-[var(--color-text-muted)] underline decoration-dotted decoration-[rgba(255,255,255,0.25)] underline-offset-[3px]">
            last 30 days
          </span>
        </Tooltip>
      </span>
    </div>
  );
}

const GROUP_LABEL =
  "text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)]";

/** Stats split into labeled groups: eligible sports first, then the rest.
 *  Used where there is room to say it out loud (subscribe page). */
export function EligibilityGroups({
  eligibility,
}: {
  eligibility: VipEligibility[];
}) {
  const yes = eligibility.filter((e) => e.eligible);
  const no = eligibility.filter((e) => !e.eligible);
  if (eligibility.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {yes.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className={`${GROUP_LABEL} text-[var(--color-vip-text)]`}>
              Eligible sports
            </span>
            <span
              aria-hidden="true"
              className="text-[var(--color-text-muted)] text-[10px]"
            >
              ·
            </span>
            <Tooltip content={ELIGIBILITY_TOOLTIP}>
              <span className="cursor-help text-[11px] text-[var(--color-text-muted)] underline decoration-dotted decoration-[rgba(255,255,255,0.25)] underline-offset-[3px]">
                last 30 days
              </span>
            </Tooltip>
          </div>
          <div className="flex flex-wrap items-center gap-x-9 gap-y-3">
            {yes.map((row) => (
              <EligibilityStat key={row.sport} row={row} />
            ))}
          </div>
        </div>
      )}
      {no.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className={GROUP_LABEL}>Ineligible</span>
          <div className="flex flex-wrap items-center gap-x-9 gap-y-3">
            {no.map((row) => (
              <EligibilityStat key={row.sport} row={row} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
