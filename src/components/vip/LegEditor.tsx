"use client";

// Leg rows for the VIP pick composer. Markup mirrors the admin manual-entry
// panel (src/app/admin/audit/AddBetPanel.tsx); the draft shape and the
// draft-to-input mapping are shared via src/lib/legDraft.ts. Games come from
// the user-token VIP search. No player props in v1.

import { useState } from "react";
import { EMPTY_LEG, LEG_TYPE_LABEL, todayEt, type LegDraft, type LegType } from "@/lib/legDraft";
import { searchVipGames } from "@/lib/vip/client";
import type { VipGameResult, VipSport } from "@/lib/vip/types";

export const inputCls =
  "px-2.5 py-1.5 text-[12px] rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(255,255,255,0.20)] disabled:opacity-40";
export const btnCls =
  "px-3 py-1.5 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]";
export const labelCls =
  "text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold";
// Native <option> rows paint the OS white otherwise (same fix as the admin panel).
export const optionCls = "bg-[#0e0e12] text-[var(--color-text)]";

const VIP_LEG_TYPES: LegType[] = ["ml", "spread", "total", "team_runs", "nrfi", "custom"];

function legTypeOptions(sport: VipSport): Array<[LegType, string]> {
  return VIP_LEG_TYPES.filter((t) => t !== "nrfi" || sport === "MLB").map((t) => [
    t,
    t === "spread" && sport !== "MLB" ? "Spread" : LEG_TYPE_LABEL[t],
  ]);
}

function gameLabel(g: { away_team: string | null; home_team: string | null; game_number?: number | null }) {
  const dh = g.game_number && g.game_number > 1 ? ` (G${g.game_number})` : "";
  return `${g.away_team} @ ${g.home_team}${dh}`;
}

interface Props {
  sport: VipSport;
  legs: LegDraft[];
  onChange: (legs: LegDraft[]) => void;
  token: string;
  /** True when the parlay carries combined odds; per-leg odds are then locked. */
  legOddsDisabled?: boolean;
}

export function LegEditor({ sport, legs, onChange, token, legOddsDisabled = false }: Props) {
  const [gameDate, setGameDate] = useState(todayEt());
  const [team, setTeam] = useState("");
  // Search results are tagged with the sport they were requested for and
  // only shown while that sport is still selected, so a sport switch (or a
  // lookup racing one) never offers another sport's games (same guard as
  // the admin panel's sportRef).
  const [search, setSearch] = useState<{
    sport: VipSport;
    games: VipGameResult[] | null;
    error: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetIdx, setTargetIdx] = useState(0);
  const current = search?.sport === sport ? search : null;
  const games = current?.games ?? null;
  const gamesError = current?.error ?? null;

  const setLeg = (idx: number, patch: Partial<LegDraft>) =>
    onChange(legs.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const loadGames = async () => {
    const requested = sport;
    setLoading(true);
    try {
      const res = await searchVipGames(gameDate, team.trim(), requested, token);
      setSearch({ sport: requested, games: res.results ?? [], error: null });
    } catch (err) {
      console.error("VIP game search failed", err);
      setSearch({ sport: requested, games: null, error: "Could not load games. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const target = Math.min(targetIdx, legs.length - 1);
  const typeOptions = legTypeOptions(sport);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        <span className={labelCls}>Games</span>
        <input
          type="date"
          aria-label="Game date"
          className={inputCls}
          value={gameDate}
          onChange={(e) => setGameDate(e.target.value)}
        />
        <input
          className={`${inputCls} w-32`}
          placeholder="team (optional)"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        />
        <button type="button" onClick={loadGames} className={btnCls} disabled={loading}>
          List games
        </button>
        {games && games.length > 0 && (
          <span className="text-[10px] text-[var(--color-text-muted)]">
            click a game to assign it to leg {target + 1}
          </span>
        )}
        {games && games.length === 0 && (
          <span className="text-[10px] text-[var(--color-text-muted)]">No games found.</span>
        )}
        {gamesError && <span className="text-[11px] text-[#f87171] font-semibold">{gamesError}</span>}
      </div>
      {games && games.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {games.map((g) => (
            <button
              key={`${g.game_pk}`}
              type="button"
              onClick={() => setLeg(target, { game: g })}
              className="px-2.5 py-1.5 rounded text-[11px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)]"
            >
              {gameLabel(g)}
            </button>
          ))}
        </div>
      )}

      {legs.map((leg, idx) => (
        <div
          key={idx}
          className={`rounded-lg border p-3 flex flex-col gap-2 ${
            idx === target ? "border-[rgba(255,255,255,0.22)]" : "border-[rgba(255,255,255,0.08)]"
          }`}
          onClick={() => setTargetIdx(idx)}
        >
          <div className="flex flex-wrap gap-2 items-center">
            <span className={labelCls}>Leg {idx + 1}</span>
            <select
              aria-label={`Leg ${idx + 1} market`}
              className={inputCls}
              value={leg.type}
              onChange={(e) => setLeg(idx, { type: e.target.value as LegType })}
            >
              {typeOptions.map(([v, label]) => (
                <option key={v} value={v} className={optionCls}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className={`${inputCls} flex-1 min-w-[160px]`}
              placeholder='selection text, e.g. "Yankees ML"'
              value={leg.selection}
              onChange={(e) => setLeg(idx, { selection: e.target.value })}
            />
            <input
              aria-label={`Leg ${idx + 1} odds`}
              className={`${inputCls} w-24`}
              placeholder="odds"
              value={leg.odds}
              disabled={legOddsDisabled}
              onChange={(e) => setLeg(idx, { odds: e.target.value })}
            />
            <span className="text-[11px] text-[var(--color-text-soft)] font-semibold">
              {leg.game ? gameLabel(leg.game) : "no game picked"}
            </span>
            {legs.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(legs.filter((_, i) => i !== idx));
                  setTargetIdx(0);
                }}
                className={btnCls}
              >
                Remove
              </button>
            )}
          </div>
          {(leg.type === "spread" ||
            leg.type === "total" ||
            leg.type === "team_runs" ||
            leg.type === "custom") && (
            <div className="flex flex-wrap gap-2 items-center">
              {leg.type === "custom" && (
                <input
                  className={`${inputCls} w-40`}
                  placeholder="stat, e.g. first_half_total"
                  value={leg.statName}
                  onChange={(e) => setLeg(idx, { statName: e.target.value })}
                />
              )}
              {leg.type !== "spread" && (
                <select
                  aria-label={`Leg ${idx + 1} direction`}
                  className={inputCls}
                  value={leg.direction}
                  onChange={(e) => setLeg(idx, { direction: e.target.value as LegDraft["direction"] })}
                >
                  <option value="" className={optionCls}>direction</option>
                  <option value="over" className={optionCls}>over</option>
                  <option value="under" className={optionCls}>under</option>
                </select>
              )}
              <input
                aria-label={`Leg ${idx + 1} line`}
                className={`${inputCls} w-24`}
                placeholder="line"
                value={leg.line}
                onChange={(e) => setLeg(idx, { line: e.target.value })}
              />
            </div>
          )}
          {leg.type === "nrfi" && (
            <div className="flex flex-wrap gap-2 items-center">
              <select
                aria-label={`Leg ${idx + 1} direction`}
                className={inputCls}
                value={leg.direction || "under"}
                onChange={(e) => setLeg(idx, { direction: e.target.value as LegDraft["direction"] })}
              >
                <option value="under" className={optionCls}>NRFI (under 0.5)</option>
                <option value="over" className={optionCls}>YRFI (over 0.5)</option>
              </select>
            </div>
          )}
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={() => {
            onChange([...legs, { ...EMPTY_LEG }]);
            setTargetIdx(legs.length);
          }}
          className={btnCls}
        >
          + Add leg
        </button>
      </div>
    </div>
  );
}
