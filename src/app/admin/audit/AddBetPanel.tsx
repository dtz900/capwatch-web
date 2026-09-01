"use client";

// Manual bet entry for parser misses ("I need to be able to manually add
// bets when the parser doesnt do it right", 2026-08-21, the BertsBets
// "Phillies ML + Dodgers ML" parlay). One leg = straight, two+ = parlay
// with ticket odds + units on leg 0. Everything lands admin_locked.

import { useRef, useState, useTransition } from "react";
import {
  addManualBetAction,
  searchGamesAction,
  searchPlayersAction,
  type GameSearchResult,
  type ManualLegInput,
  type PlayerSearchResult,
} from "./actions";

type LegType = "ml" | "spread" | "total" | "team_runs" | "nrfi" | "player" | "custom";

interface LegDraft {
  type: LegType;
  selection: string;
  game: GameSearchResult | null;
  odds: string;
  line: string;
  direction: "over" | "under" | "";
  statName: string;
  player: PlayerSearchResult | null;
}

const EMPTY_LEG: LegDraft = {
  type: "ml",
  selection: "",
  game: null,
  odds: "",
  line: "",
  direction: "",
  statName: "",
  player: null,
};

const LEG_TYPE_LABEL: Record<LegType, string> = {
  ml: "Moneyline",
  spread: "Run line",
  total: "Total",
  team_runs: "Team total",
  nrfi: "NRFI/YRFI",
  player: "Player prop",
  custom: "Custom",
};

function legToInput(leg: LegDraft): ManualLegInput {
  const line = leg.line.trim() === "" ? null : Number(leg.line);
  const odds = leg.odds.trim() === "" ? null : Number(leg.odds);
  const base: ManualLegInput = {
    selection: leg.selection.trim(),
    game_id: leg.game ? String(leg.game.game_pk) : null,
    odds,
  };
  switch (leg.type) {
    case "ml":
      return { ...base, stat_name: "win" };
    case "spread":
      return { ...base, stat_name: "spread", line };
    case "total":
      return { ...base, stat_name: "total", direction: leg.direction || null, line };
    case "team_runs":
      return { ...base, stat_name: "team_runs", direction: leg.direction || null, line };
    case "nrfi":
      return { ...base, stat_name: "nrfi", direction: leg.direction || "under", line: 0.5 };
    case "player":
      return {
        ...base,
        stat_name: leg.statName.trim() || null,
        direction: leg.direction || null,
        line,
        player_id: leg.player?.player_id ?? null,
        player_name: leg.player?.full_name ?? null,
      };
    case "custom":
      return { ...base, stat_name: leg.statName.trim() || null, direction: leg.direction || null, line };
  }
}

const inputCls =
  "px-2.5 py-1.5 text-[12px] rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(255,255,255,0.20)]";
const btnCls =
  "px-3 py-1.5 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]";
const labelCls =
  "text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold";

function todayEt(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

export function AddBetPanel() {
  const [open, setOpen] = useState(false);
  const [capper, setCapper] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [units, setUnits] = useState("1");
  const [combinedOdds, setCombinedOdds] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [legs, setLegs] = useState<LegDraft[]>([{ ...EMPTY_LEG }]);
  const [gameDate, setGameDate] = useState(todayEt());
  const [sport, setSport] = useState<"MLB" | "NFL">("MLB");
  // Guards the in-flight game search against a sport toggle racing it
  // (Codex P2, PR #110): a lookup resolves only if its sport still matches.
  const sportRef = useRef(sport);
  const [games, setGames] = useState<GameSearchResult[]>([]);
  const [gameTargetIdx, setGameTargetIdx] = useState(0);
  const [playerQuery, setPlayerQuery] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setLeg = (idx: number, patch: Partial<LegDraft>) =>
    setLegs((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const loadGames = () =>
    startTransition(async () => {
      const requested = sport;
      const results = await searchGamesAction(gameDate, undefined, requested);
      if (sportRef.current === requested) setGames(results);
    });

  const loadPlayers = () =>
    startTransition(async () => {
      setPlayers(await searchPlayersAction(playerQuery));
    });

  const isParlay = legs.length > 1;
  const perLegOddsGiven = legs.some((l) => l.odds.trim() !== "");
  const oddsConflict = isParlay && combinedOdds.trim() !== "" && perLegOddsGiven;

  const canSubmit =
    capper.trim() !== "" &&
    legs.every((l) => l.selection.trim() !== "" && l.game !== null) &&
    !oddsConflict &&
    !pending;

  const submit = () =>
    startTransition(async () => {
      setError(null);
      setResult(null);
      const res = await addManualBetAction({
        capper: capper.trim(),
        legs: legs.map(legToInput),
        units: units.trim() === "" ? null : Number(units),
        combined_odds: combinedOdds.trim() === "" ? null : Number(combinedOdds),
        tweet_url: tweetUrl.trim() || null,
        is_live: isLive,
        sport,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(
        `Added pick${res.created_pick_ids.length === 1 ? "" : "s"} ${res.created_pick_ids.join(", ")}` +
          (res.parlay_id ? ` (parlay ${res.parlay_id})` : "") +
          (res.capper_handle ? ` for @${res.capper_handle}` : ""),
      );
      setLegs([{ ...EMPTY_LEG }]);
      setCombinedOdds("");
      setTweetUrl("");
    });

  if (!open) {
    return (
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className={btnCls}>
          + Add bet manually
        </button>
        {result && <span className="text-[11px] text-[#4ade80] font-semibold">{result}</span>}
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.02)] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className={labelCls}>Add bet manually · lands admin-locked, graded next tick</div>
        <button type="button" onClick={() => setOpen(false)} className={btnCls}>
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className={`${inputCls} w-44`}
          placeholder="@capper handle"
          value={capper}
          onChange={(e) => setCapper(e.target.value)}
        />
        <input
          className={`${inputCls} flex-1 min-w-[220px]`}
          placeholder="tweet URL (optional, links the entry to the real post)"
          value={tweetUrl}
          onChange={(e) => setTweetUrl(e.target.value)}
        />
        <input
          className={`${inputCls} w-20`}
          placeholder="units"
          value={units}
          onChange={(e) => setUnits(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-soft)] font-semibold">
          <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} />
          live bet
        </label>
      </div>

      <div className="flex flex-wrap gap-2 items-center border-t border-[rgba(255,255,255,0.06)] pt-3">
        <span className={labelCls}>Games</span>
        {(["MLB", "NFL"] as const).map((sp) => (
          <button
            key={sp}
            type="button"
            onClick={() => {
              setSport(sp);
              sportRef.current = sp;
              setGames([]);
              // A bound game from the other sport would submit an MLB
              // game_id under sport NFL (Codex P1, PR #110); unbind all.
              setLegs((ls) => ls.map((l) => ({ ...l, game: null })));
            }}
            className={`px-2.5 py-1.5 rounded text-[10px] font-bold ${
              sport === sp
                ? "bg-[rgba(255,255,255,0.14)] text-[var(--color-text)]"
                : "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.08)]"
            }`}
          >
            {sp}
          </button>
        ))}
        <input
          type="date"
          className={inputCls}
          value={gameDate}
          onChange={(e) => setGameDate(e.target.value)}
        />
        <button type="button" onClick={loadGames} className={btnCls}>
          List games
        </button>
        {games.length > 0 && (
          <span className="text-[10px] text-[var(--color-text-muted)]">
            click a game to assign it to leg {gameTargetIdx + 1}
          </span>
        )}
      </div>
      {games.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {games.map((g) => (
            <button
              key={`${g.game_pk}`}
              type="button"
              onClick={() => setLeg(gameTargetIdx, { game: g })}
              className="px-2.5 py-1.5 rounded text-[11px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)]"
            >
              {g.away_team} @ {g.home_team}
              {g.game_number && g.game_number > 1 ? ` (G${g.game_number})` : ""}
            </button>
          ))}
        </div>
      )}

      {legs.map((leg, idx) => (
        <div
          key={idx}
          className={`rounded-lg border p-3 flex flex-col gap-2 ${
            idx === gameTargetIdx
              ? "border-[rgba(255,255,255,0.22)]"
              : "border-[rgba(255,255,255,0.08)]"
          }`}
          onClick={() => setGameTargetIdx(idx)}
        >
          <div className="flex flex-wrap gap-2 items-center">
            <span className={labelCls}>Leg {idx + 1}</span>
            <select
              className={inputCls}
              value={leg.type}
              onChange={(e) => setLeg(idx, { type: e.target.value as LegType })}
            >
              {Object.entries(LEG_TYPE_LABEL).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className={`${inputCls} flex-1 min-w-[180px]`}
              placeholder='selection text, e.g. "Phillies ML"'
              value={leg.selection}
              onChange={(e) => setLeg(idx, { selection: e.target.value })}
            />
            <input
              className={`${inputCls} w-24`}
              placeholder="leg odds"
              value={leg.odds}
              onChange={(e) => setLeg(idx, { odds: e.target.value })}
            />
            <span className="text-[11px] text-[var(--color-text-soft)] font-semibold">
              {leg.game
                ? `${leg.game.away_team} @ ${leg.game.home_team}`
                : "no game bound"}
            </span>
            {legs.length > 1 && (
              <button
                type="button"
                onClick={() => setLegs((ls) => ls.filter((_, i) => i !== idx))}
                className={btnCls}
              >
                Remove
              </button>
            )}
          </div>
          {(leg.type === "spread" ||
            leg.type === "total" ||
            leg.type === "team_runs" ||
            leg.type === "player" ||
            leg.type === "custom") && (
            <div className="flex flex-wrap gap-2 items-center">
              {(leg.type === "player" || leg.type === "custom") && (
                <input
                  className={`${inputCls} w-40`}
                  placeholder="stat_name, e.g. strikeouts"
                  value={leg.statName}
                  onChange={(e) => setLeg(idx, { statName: e.target.value })}
                />
              )}
              {leg.type !== "spread" && (
                <select
                  className={inputCls}
                  value={leg.direction}
                  onChange={(e) =>
                    setLeg(idx, { direction: e.target.value as LegDraft["direction"] })
                  }
                >
                  <option value="">direction</option>
                  <option value="over">over</option>
                  <option value="under">under</option>
                </select>
              )}
              <input
                className={`${inputCls} w-24`}
                placeholder="line"
                value={leg.line}
                onChange={(e) => setLeg(idx, { line: e.target.value })}
              />
              {leg.type === "player" && (
                <>
                  <input
                    className={`${inputCls} w-40`}
                    placeholder="search player"
                    value={playerQuery}
                    onChange={(e) => setPlayerQuery(e.target.value)}
                  />
                  <button type="button" onClick={loadPlayers} className={btnCls}>
                    Search
                  </button>
                  {leg.player && (
                    <span className="text-[11px] text-[var(--color-text-soft)] font-semibold">
                      {leg.player.full_name} (id {leg.player.player_id})
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          {leg.type === "player" && players.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {players.slice(0, 8).map((p) => (
                <button
                  key={p.player_id}
                  type="button"
                  onClick={() => {
                    setLeg(idx, { player: p });
                    setPlayers([]);
                  }}
                  className="px-2.5 py-1.5 rounded text-[11px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)]"
                >
                  {p.full_name} · {p.team_abbreviation ?? "?"}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => {
            setLegs((ls) => [...ls, { ...EMPTY_LEG }]);
            setGameTargetIdx(legs.length);
          }}
          className={btnCls}
        >
          + Add leg
        </button>
        {isParlay && (
          <input
            className={`${inputCls} w-36`}
            placeholder="combined odds"
            value={combinedOdds}
            onChange={(e) => setCombinedOdds(e.target.value)}
          />
        )}
        {oddsConflict && (
          <span className="text-[11px] text-[#f87171] font-semibold">
            Give either combined odds or per-leg odds, not both.
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {error && <span className="text-[11px] text-[#f87171] font-semibold">{error}</span>}
          {result && <span className="text-[11px] text-[#4ade80] font-semibold">{result}</span>}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className={`px-4 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-[0.10em] ${
              canSubmit
                ? "bg-[#4ade80] text-black hover:opacity-90"
                : "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)] cursor-not-allowed"
            }`}
          >
            {pending ? "Saving..." : isParlay ? `Add ${legs.length}-leg parlay` : "Add bet"}
          </button>
        </div>
      </div>
    </section>
  );
}
