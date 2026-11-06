"use client";

/* NCAAB has no stored board: the seller finds a game (date + team), and its
 * lines are fetched from the platform for that one game. Each opened game
 * joins the builder's game list so its prices tap onto the slip. */

import { useState } from "react";
import { getVipBoardGame, searchVipGames } from "@/lib/vip/client";
import type { VipGameResult } from "@/lib/vip/types";
import { EYEBROW, INNER_CARD, SECONDARY_BTN_SM } from "@/components/vip/styles";
import { PERIODS, fromBoard, type BuilderGame, type Period } from "./adapt";
import { boardLoadError, searchLoadError } from "./errors";
import { GameLines } from "./GameLines";
import { Segmented, TeamCell, type TapFn } from "./ui";

const field =
  "h-9 px-2.5 text-[12px] rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[rgba(255,255,255,0.22)]";

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Two schools can share an abbreviation, so a result names both. */
export function matchupText(r: VipGameResult): string {
  return `${r.away_name ?? r.away_team} at ${r.home_name ?? r.home_team}`;
}

const timeOf = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

export function NcaabPicker({
  token,
  games,
  onOpen,
  selected,
  onTap,
  period,
  onPeriod,
}: {
  token: string;
  /** NCAAB games opened so far. */
  games: BuilderGame[];
  onOpen: (g: BuilderGame) => void;
  selected: Set<string>;
  onTap: TapFn;
  period: Period;
  onPeriod: (p: Period) => void;
}) {
  const [date, setDate] = useState(today);
  const [team, setTeam] = useState("");
  const [results, setResults] = useState<VipGameResult[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setSearching(true);
    setError(null);
    try {
      const res = await searchVipGames(date, team.trim(), "NCAAB", token);
      setResults(res.results);
      setTruncated(res.truncated === true);
    } catch (err) {
      setResults(null);
      setError(searchLoadError(err));
    } finally {
      setSearching(false);
    }
  };

  const open = async (r: VipGameResult) => {
    const id = String(r.game_pk);
    if (games.some((g) => g.id === id)) return;
    setOpening(id);
    setError(null);
    try {
      onOpen(fromBoard(await getVipBoardGame("NCAAB", id, token), new Date()));
    } catch (err) {
      setError(boardLoadError(err));
    } finally {
      setOpening(null);
    }
  };

  const periods = PERIODS.filter(([p]) => p === "Game" || games.some((g) => g.periods[p]));
  return (
    <div className="flex flex-col gap-3">
      <div className={`${INNER_CARD} flex flex-col gap-3`}>
        <span className={EYEBROW}>NCAAB games</span>
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <input aria-label="Game date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          <input
            aria-label="School"
            placeholder="School (optional)"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className={`${field} flex-1`}
          />
          <button type="submit" className={SECONDARY_BTN_SM} disabled={searching || date === ""}>
            {searching ? "Searching..." : "Find games"}
          </button>
        </form>
        {error && (
          <span role="status" className="text-[11px] text-[var(--color-neg)] font-semibold">
            {error}
          </span>
        )}
        {results && results.length === 0 && (
          <p className="text-[12px] text-[var(--color-text-muted)]">No games found for that day.</p>
        )}
        {results && results.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {results.map((r) => {
              const id = String(r.game_pk);
              const added = games.some((g) => g.id === id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={added || opening !== null}
                    onClick={() => void open(r)}
                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-[rgba(255,255,255,0.08)] px-3 py-2 text-left hover:border-[rgba(255,255,255,0.22)] disabled:opacity-60"
                  >
                    <span className="text-[13px] font-bold text-[var(--color-text)]">{matchupText(r)}</span>
                    <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">
                      {opening === id ? "Loading lines..." : added ? "On the board" : timeOf(r.commence_time)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {truncated && (
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Showing the first games of the day. Type a school to narrow the list.
          </p>
        )}
      </div>

      {periods.length > 1 && (
        <Segmented<Period> size="sm" value={period} onChange={onPeriod} options={periods.map(([p, label]) => [p, label])} />
      )}
      {games.map((g) => (
        <div key={g.id} className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.015)] flex flex-col gap-3 px-4 sm:px-5 py-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)] tabular-nums">
            {g.day} · {g.time}
            {g.neutralSite ? " · Neutral site" : ""}
          </span>
          {g.noLines ? (
            <div className="flex flex-col gap-2">
              <TeamCell sport={g.sport} abbr={g.away} />
              <TeamCell sport={g.sport} abbr={g.home} />
              <p className="text-[12px] text-[var(--color-text-muted)]">
                No lines posted yet. Check back closer to tip, or add the bet with &quot;Bet not on the board&quot;.
              </p>
            </div>
          ) : (
            <GameLines g={g} selected={selected} onTap={onTap} />
          )}
        </div>
      ))}
    </div>
  );
}
