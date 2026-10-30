"use client";

import { useState } from "react";
import { TeamLogo } from "@/components/slate/TeamLogo";
import { CHIP_MUTED, EYEBROW } from "@/components/vip/styles";
import type { BoardSport } from "@/lib/vip/types";
import { PERIODS, teamName, teamTerms, type BuilderGame, type Period } from "./adapt";
import { GameLines } from "./GameLines";
import { PropsView, nameMatches, norm } from "./PropsView";
import { Segmented, TeamCell, type TapFn } from "./ui";

type GameMatch = "all" | "team" | "player" | null;

/** How a game matches the top search: a team (name, city, abbreviation,
 *  nickname) or a player in its props. A player hit opens that game on the
 *  player's props. */
export function gameMatch(g: BuilderGame, query: string): GameMatch {
  const q = norm(query);
  if (!q) return "all";
  const words = q.split(" ");
  const hits = (text: string) => words.every((w) => text.split(/[ |]+/).some((tok) => tok.startsWith(w)));
  const teamText = (abbr: string) => norm(teamTerms(g.sport, abbr).join(" | "));
  if (hits(teamText(g.away)) || hits(teamText(g.home))) return "team";
  const names = [...new Set(g.props.map((m) => m.player))];
  return names.some((n) => nameMatches(n, q)) ? "player" : null;
}

function Matchup({ g }: { g: BuilderGame }) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <TeamLogo abbr={g.away} sport={g.sport} size={22} flat />
      <span className="text-[15px] font-bold tracking-[-0.01em] text-[var(--color-text)]">{teamName(g.sport, g.away)}</span>
      <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">@</span>
      <TeamLogo abbr={g.home} sport={g.sport} size={22} flat />
      <span className="text-[15px] font-bold tracking-[-0.01em] text-[var(--color-text)]">{teamName(g.sport, g.home)}</span>
    </div>
  );
}

function GameRow({
  g,
  selected,
  onTap,
  playerQuery = null,
}: {
  g: BuilderGame;
  selected: Set<string>;
  onTap: TapFn;
  /** Set when the top search matched a player here: open on their props. */
  playerQuery?: string | null;
}) {
  const [view, setView] = useState<"lines" | "props">(playerQuery ? "props" : "lines");
  return (
    <div className={`flex flex-col gap-3 px-4 sm:px-5 py-4 border-t border-[rgba(255,255,255,0.06)] first:border-t-0 ${g.started ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)] tabular-nums">
          {g.day} · {g.time}
        </span>
        {g.started && <span className={CHIP_MUTED}>Started</span>}
        {!g.started && g.loaded && (
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[rgba(255,255,255,0.04)] sm:ml-auto">
            {(["lines", "props"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`h-7 px-3 rounded-md text-[11px] font-bold transition-colors duration-200 ${
                  view === v ? "bg-[rgba(255,255,255,0.10)] text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {v === "lines" ? "Game lines" : "Player props"}
              </button>
            ))}
          </div>
        )}
      </div>
      {g.started || !g.loaded ? (
        <div className="flex flex-col gap-2">
          <TeamCell sport={g.sport} abbr={g.away} />
          <TeamCell sport={g.sport} abbr={g.home} />
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {g.started ? "VIP picks close at the scheduled start." : "Loading prices..."}
          </p>
        </div>
      ) : view === "props" ? (
        <>
          {/* The team rows give way to props, so the matchup has to stay. */}
          <Matchup g={g} />
          {g.props.length > 0 ? (
            <PropsView g={g} selected={selected} onTap={onTap} initialQuery={playerQuery ?? ""} />
          ) : (
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {g.day === "Tonight" ? "No props posted for this game yet." : "Props open closer to game time."}
            </p>
          )}
        </>
      ) : (
        <GameLines g={g} selected={selected} onTap={onTap} />
      )}
    </div>
  );
}

export function Board({
  sports,
  sport,
  onSport,
  games,
  day,
  onDay,
  query,
  onQuery,
  period,
  onPeriod,
  selected,
  onTap,
  legCount,
  books,
  status,
}: {
  sports: BoardSport[];
  sport: BoardSport;
  onSport: (s: BoardSport) => void;
  /** Every game on the chosen sport's slate, by start. */
  games: BuilderGame[];
  day: string;
  onDay: (d: string) => void;
  query: string;
  onQuery: (q: string) => void;
  period: Period;
  onPeriod: (p: Period) => void;
  selected: Set<string>;
  onTap: TapFn;
  legCount: (s: BoardSport) => number;
  books: number;
  status: "loading" | "error" | "ready";
}) {
  const days = [...new Set(games.map((g) => g.day))];
  // A search looks across every day; otherwise show the chosen day.
  const shown = games
    .filter((g) => query.trim() !== "" || g.day === day)
    .map((g) => ({ g, match: gameMatch(g, query) }))
    .filter((x) => x.match !== null);
  const periods = PERIODS.filter(([p]) => p === "Game" || games.some((g) => g.periods[p]));
  const empty =
    status === "loading" ? "Loading the board..."
      : status === "error" ? "Could not load the board. Refresh to try again."
        : games.length === 0 ? `No ${sport} games on the board right now.`
          : "No games match.";
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {sports.length > 1 && (
            <Segmented<BoardSport>
              value={sport}
              onChange={onSport}
              options={sports.map((sp) => [
                sp,
                <span key={sp} className="tracking-[0.08em]">
                  {sp}
                  {legCount(sp) > 0 && <span className="ml-1.5 opacity-55">{legCount(sp)}</span>}
                </span>,
              ])}
            />
          )}
          {query.trim() === "" && days.length > 0 && (
            <Segmented<string>
              value={day}
              onChange={onDay}
              options={days.map((d) => [
                d,
                <span key={d}>
                  {d}
                  <span className="ml-1.5 opacity-55">{games.filter((g) => g.day === d).length}</span>
                </span>,
              ])}
            />
          )}
          <div className="relative w-full sm:w-56 sm:ml-auto">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]">
              <path fill="currentColor" d="M8.5 3a5.5 5.5 0 0 1 4.38 8.83l3.65 3.64-1.06 1.06-3.64-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
            </svg>
            <input
              aria-label="Find a game"
              placeholder="Team, city or player"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              className="h-9 w-full pl-9 pr-3 text-[12px] rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[rgba(255,255,255,0.22)]"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {periods.length > 1 && (
            <Segmented<Period> size="sm" value={period} onChange={onPeriod} options={periods.map(([p, label]) => [p, label])} />
          )}
          {books > 0 && <span className="text-[11px] text-[var(--color-text-muted)] sm:ml-auto">{books} books</span>}
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.015)]">
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_330px] gap-4 px-5 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
          <span className={EYEBROW}>{PERIODS.find(([p]) => p === period)?.[1]}</span>
          <div className="grid grid-cols-3 gap-2 text-center">
            {["Spread", "Total", "Money"].map((h) => (
              <span key={h} className={EYEBROW}>
                {h}
              </span>
            ))}
          </div>
        </div>
        {shown.map(({ g, match }) => (
          <GameRow
            key={`${g.id}|${match === "player" ? query : ""}`}
            g={g}
            selected={selected}
            onTap={onTap}
            playerQuery={match === "player" ? query : null}
          />
        ))}
        {shown.length === 0 && <p className="px-5 py-6 text-[12px] text-[var(--color-text-muted)]">{empty}</p>}
      </div>
    </>
  );
}
