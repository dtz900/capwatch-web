"use client";

import { useEffect, useState } from "react";
import { sideSelection } from "../sideSelection";
import { searchGamesAction, type GameSearchResult } from "../actions";
import { postedYmd } from "./dates";
import { ErrorLine, useEditorError, type EditorProps } from "./types";

/** Finds the bound game, trying the game date then the posted date. */
export function useBoundGame(p: EditorProps["p"]): GameSearchResult | null {
  const [game, setGame] = useState<GameSearchResult | null>(null);
  useEffect(() => {
    setGame(null);
    if (!p.game_id) return;
    let live = true;
    const dates = [p.game_date, postedYmd(p.posted_at)].filter(
      (d, i, a): d is string => !!d && a.indexOf(d) === i,
    );
    (async () => {
      for (const d of dates) {
        const r = await searchGamesAction(d, undefined, p.sport);
        const hit = r.ok ? r.results.find((g) => String(g.game_pk) === p.game_id) : undefined;
        if (hit) {
          if (live) setGame(hit);
          return;
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [p.game_id, p.game_date, p.posted_at, p.sport]);
  return game;
}

/** True when the selection reads differently for the two sides of the game. */
export function needsSide(selection: string | null, game: GameSearchResult | null): game is GameSearchResult {
  return (
    !!game &&
    !!game.away_team &&
    !!game.home_team &&
    sideSelection(selection, game.away_team) !== sideSelection(selection, game.home_team)
  );
}

export function SideEditor({ p, disabled, onPatch, game }: EditorProps & { game: GameSearchResult }) {
  const { error, run } = useEditorError(onPatch);
  const sides = [
    { abbr: game.away_team ?? "", tag: "away" },
    { abbr: game.home_team ?? "", tag: "home" },
  ];
  return (
    <div>
      <div className="flex gap-2">
        {sides.map((s) => (
          <button
            key={s.tag}
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = sideSelection(p.selection, s.abbr);
              return run({ selection: next }, `Selection set to ${next}`);
            }}
            className="border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[12px] font-extrabold text-[var(--color-text-soft)] hover:text-[var(--color-text)] disabled:opacity-50"
          >
            {s.abbr} ({s.tag})
          </button>
        ))}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}
