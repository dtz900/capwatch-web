"use client";

import { useMemo, useState } from "react";
import "@/lib/ncaab-teams-register";
import { buildCard, splitBoard } from "@/lib/ncaab-slate";
import { ncaabLogoUrlForId } from "@/lib/ncaab-teams";
import type { SlateGame } from "@/lib/types";
import { NcaabFlipCard } from "./NcaabFlipCard";
import { StatusChip, deriveLifecycle } from "./StatusChip";
import { TeamLogo } from "./TeamLogo";

const GRID = "grid grid-cols-1 min-[641px]:grid-cols-2 min-[1181px]:grid-cols-4";

/**
 * The NCAAB slate: flip cards for games with picks, ordered by distinct
 * sharps (4 across, 2 at tablet, 1 on phone), then every zero-pick game
 * collapsed behind one "+N more games with no picks" row.
 */
export function NcaabSlateView({ games }: { games: SlateGame[] }) {
  const { withPicks, quiet } = useMemo(() => splitBoard(games), [games]);
  const cards = useMemo(() => withPicks.map(buildCard), [withPicks]);
  const [showQuiet, setShowQuiet] = useState(false);

  return (
    <div data-testid="ncaab-slate">
      {cards.length > 0 && (
        <div className={`${GRID} gap-3.5`}>
          {cards.map((c) => (
            <NcaabFlipCard key={c.id} card={c} />
          ))}
        </div>
      )}
      {quiet.length > 0 && (
        <div className={cards.length > 0 ? "mt-4" : ""}>
          <button
            type="button"
            onClick={() => setShowQuiet((v) => !v)}
            aria-expanded={showQuiet}
            aria-controls="ncaab-quiet-games"
            className="w-full min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[#a1a1aa] text-[11px] font-extrabold tracking-[0.14em] cursor-pointer flex items-center justify-center gap-2 uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text)]"
          >
            {showQuiet ? "Hide" : "+"} {quiet.length} {cards.length > 0 ? "more " : ""}
            {quiet.length === 1 ? "game" : "games"} with no picks
            <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={showQuiet ? "rotate-180" : ""}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showQuiet && (
            <ul id="ncaab-quiet-games" className={`mt-2 ${GRID} gap-x-6`}>
              {quiet.map((g) => (
                <li key={g.game_id} className="flex items-center justify-between gap-3 py-2 text-[12px] border-b border-[var(--color-border)]">
                  <span className="flex items-center gap-2 min-w-0 text-[var(--color-text-soft)] font-bold text-[13px]">
                    <TeamLogo abbr={g.away_team} sport="NCAAB" logoUrl={ncaabLogoUrlForId(g.away_team_id)} size={16} flat />
                    {g.away_team}
                    <span className="text-[var(--color-text-muted)] font-medium text-[11px]">@</span>
                    <TeamLogo abbr={g.home_team} sport="NCAAB" logoUrl={ncaabLogoUrlForId(g.home_team_id)} size={16} flat />
                    {g.home_team}
                  </span>
                  <StatusChip lifecycle={deriveLifecycle(g)} game={g} gameTime={g.game_time} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
