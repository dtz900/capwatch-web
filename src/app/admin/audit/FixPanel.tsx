"use client";

import { useState, useTransition } from "react";
import {
  patchPickAction,
  manualGradeAction,
  deletePickAction,
  searchPlayersAction,
  searchGamesAction,
  type PlayerSearchResult,
  type GameSearchResult,
} from "./actions";

interface Props {
  pickId: number;
  reason: string;
  market: string | null;
  selection: string | null;
  line: number | null;
  oddsTaken: number | null;
  units: number | null;
  playerId: number | null;
  gameId: string | null;
  postedAt: string | null;
}

const MARKET_OPTIONS = [
  "ML", "spread", "total", "run_line", "team_total",
  "f5_ml", "f5_spread", "f5_total",
  "nrfi", "yrfi",
  "prop_pitcher_k", "prop_pitcher_outs", "prop_pitcher_er", "prop_pitcher_h", "prop_pitcher_bb",
  "prop_batter_h", "prop_batter_tb", "prop_batter_r", "prop_batter_rbi", "prop_batter_hr", "prop_batter_sb",
];

export function FixPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-pick the most relevant edit lane based on the failure reason.
  // player_did_not_play almost always means the capper tweeted late on
  // day N about day N+1's slate and we bound to a day-N game. Land in
  // the game lane so the user sees the date picker and prev/next.
  type EditLane = "none" | "player" | "game" | "market" | "line" | "more";
  const defaultLane: EditLane =
    props.reason === "missing_player_id"
      ? "player"
      : props.reason === "missing_game_id"
        ? "game"
        : props.reason === "player_did_not_play"
          ? "game"
          : props.reason === "market_unhandled"
            ? "market"
            : props.reason === "missing_line"
              ? "line"
              : "none";
  const [lane, setLane] = useState<EditLane>(defaultLane);

  // Player search state
  const [playerQuery, setPlayerQuery] = useState(props.selection ?? "");
  const [playerResults, setPlayerResults] = useState<PlayerSearchResult[]>([]);

  // Game search state
  const [gameResults, setGameResults] = useState<GameSearchResult[]>([]);

  // Field overrides (only used by the "more options" lane)
  const [marketEdit, setMarketEdit] = useState(props.market ?? "");
  const [lineEdit, setLineEdit] = useState(props.line == null ? "" : String(props.line));
  const [oddsEdit, setOddsEdit] = useState(props.oddsTaken == null ? "" : String(props.oddsTaken));
  const [unitsEdit, setUnitsEdit] = useState(props.units == null ? "" : String(props.units));
  const [playerIdEdit, setPlayerIdEdit] = useState(props.playerId == null ? "" : String(props.playerId));
  const [gameIdEdit, setGameIdEdit] = useState(props.gameId ?? "");

  const flash = (msg: string, ok: boolean) => {
    if (ok) {
      setSuccess(msg);
      setError(null);
    } else {
      setError(msg);
      setSuccess(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3500);
  };

  const runAction = <T,>(fn: () => Promise<T>, okMsg: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const out = (await fn()) as { ok?: boolean; error?: string };
      if (out && out.ok) flash(okMsg, true);
      else flash(out?.error ?? "Failed", false);
    });
  };

  const onMarkOutcome = (outcome: "win" | "loss" | "push" | "void") => {
    runAction(() => manualGradeAction(props.pickId, outcome), `Marked ${outcome.toUpperCase()}`);
  };

  const onPickPlayer = (p: PlayerSearchResult) => {
    runAction(
      () => patchPickAction(props.pickId, { player_id: p.player_id }),
      `Set player ${p.full_name}`,
    );
  };

  const onPickGame = (g: GameSearchResult) => {
    runAction(
      () => patchPickAction(props.pickId, { game_id: String(g.game_pk) }),
      `Set game ${g.away_team}@${g.home_team}`,
    );
  };

  const onPickMarket = (m: string) => {
    runAction(() => patchPickAction(props.pickId, { market: m }), `Market → ${m}`);
  };

  const onSaveLine = () => {
    if (lineEdit === "") {
      flash("Line is empty", false);
      return;
    }
    runAction(
      () => patchPickAction(props.pickId, { line: Number(lineEdit) }),
      `Line set to ${lineEdit}`,
    );
  };

  const onSaveAllFields = () => {
    const patch: Record<string, string | number | null> = {};
    if (marketEdit !== (props.market ?? "")) patch.market = marketEdit || null;
    if (lineEdit !== (props.line == null ? "" : String(props.line))) {
      patch.line = lineEdit === "" ? null : Number(lineEdit);
    }
    if (oddsEdit !== (props.oddsTaken == null ? "" : String(props.oddsTaken))) {
      patch.odds_taken = oddsEdit === "" ? null : parseInt(oddsEdit, 10);
    }
    if (unitsEdit !== (props.units == null ? "" : String(props.units))) {
      patch.units = unitsEdit === "" ? null : Number(unitsEdit);
    }
    if (playerIdEdit !== (props.playerId == null ? "" : String(props.playerId))) {
      patch.player_id = playerIdEdit === "" ? null : parseInt(playerIdEdit, 10);
    }
    if (gameIdEdit !== (props.gameId ?? "")) patch.game_id = gameIdEdit || null;
    if (Object.keys(patch).length === 0) {
      flash("No changes", false);
      return;
    }
    runAction(() => patchPickAction(props.pickId, patch), "Saved");
  };

  const doSearchPlayer = () => {
    if (!playerQuery.trim()) return;
    startTransition(async () => {
      const r = await searchPlayersAction(playerQuery);
      setPlayerResults(r);
    });
  };

  // For player_did_not_play, default to posted_at + 1 day. The capper
  // almost always tweeted late at night about the next day's slate, so
  // tomorrow's schedule is the right starting point.
  const baseDate = props.postedAt
    ? new Date(props.postedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const defaultGameDate =
    props.reason === "player_did_not_play"
      ? (() => {
          const d = new Date(baseDate + "T12:00:00Z");
          d.setUTCDate(d.getUTCDate() + 1);
          return d.toISOString().slice(0, 10);
        })()
      : baseDate;
  const [gameSearchDate, setGameSearchDate] = useState<string>(defaultGameDate);

  const doListGames = (overrideDate?: string) => {
    const ymd = overrideDate ?? gameSearchDate;
    if (!ymd) {
      flash("No date specified", false);
      return;
    }
    if (overrideDate) setGameSearchDate(overrideDate);
    startTransition(async () => {
      const r = await searchGamesAction(ymd);
      setGameResults(r);
    });
  };

  const shiftDay = (delta: number): string => {
    const d = new Date(gameSearchDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  };

  if (!open) {
    return (
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-[0.10em]
                     bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]"
        >
          Fix
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-3.5 text-[11px] flex flex-col gap-3">
      {/* Section 1: Manual outcome (the big primary action) */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold mb-2">
          What was the outcome?
        </div>
        <div className="flex flex-wrap gap-2">
          <OutcomeButton label="Win" tone="pos" disabled={pending} onClick={() => onMarkOutcome("win")} />
          <OutcomeButton label="Loss" tone="neg" disabled={pending} onClick={() => onMarkOutcome("loss")} />
          <OutcomeButton label="Push" tone="neutral" disabled={pending} onClick={() => onMarkOutcome("push")} />
          <OutcomeButton label="Void" tone="muted" disabled={pending} onClick={() => onMarkOutcome("void")} />
        </div>
      </div>

      {/* Section 2: Reason-specific edit (if any) */}
      {lane !== "none" && (
        <div className="border-t border-[rgba(255,255,255,0.06)] pt-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold mb-2">
            {lane === "player" && "Resolve player"}
            {lane === "game" && "Resolve game"}
            {lane === "market" && "Pick the right market"}
            {lane === "line" && "Set the line"}
            {lane === "more" && "All fields"}
          </div>

          {lane === "player" && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playerQuery}
                  onChange={(e) => setPlayerQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doSearchPlayer()}
                  placeholder="Type a player name..."
                  className="flex-1 px-2.5 py-1.5 text-[12px] rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(255,255,255,0.20)]"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={doSearchPlayer}
                  className="px-3 py-1.5 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]"
                >
                  Search
                </button>
              </div>
              {playerResults.length > 0 && (
                <div className="flex flex-col gap-1">
                  {playerResults.map((p) => (
                    <button
                      key={p.player_id}
                      type="button"
                      disabled={pending}
                      onClick={() => onPickPlayer(p)}
                      className="text-left px-2.5 py-1.5 rounded text-[11px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] flex items-center gap-2"
                    >
                      <span className="font-semibold text-[var(--color-text)]">{p.full_name}</span>
                      <span className="text-[var(--color-text-muted)]">{p.team_abbreviation ?? "?"}</span>
                      <span className="text-[var(--color-text-muted)] ml-auto">id {p.player_id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {lane === "game" && (
            <div className="flex flex-col gap-2">
              {props.reason === "player_did_not_play" && (
                <div className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                  This player wasn&apos;t in the bound game&apos;s box score.
                  Likely cause: tweet was for tomorrow&apos;s slate. Defaulted
                  the search to the day after the tweet.
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={gameSearchDate}
                  onChange={(e) => setGameSearchDate(e.target.value)}
                  className="bg-[rgba(0,0,0,0.30)] border border-[rgba(255,255,255,0.10)] rounded px-2 py-1 text-[11px] text-[var(--color-text)] outline-none focus:border-[rgba(255,255,255,0.25)]"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => doListGames()}
                  className="px-3 py-1.5 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]"
                >
                  List games
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => doListGames(shiftDay(-1))}
                  title="Search the day before"
                  className="px-2 py-1.5 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-muted)]"
                >
                  ← prev
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => doListGames(shiftDay(1))}
                  title="Search the day after"
                  className="px-2 py-1.5 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-muted)]"
                >
                  next →
                </button>
              </div>
              {gameResults.length > 0 && (
                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                  {(() => {
                    // Doubleheader detection: a matchup that appears more than
                    // once on the date. game_number comes from MLB Stats API
                    // and is the canonical source for which is Game 1 vs 2.
                    const matchupCount: Record<string, number> = {};
                    for (const g of gameResults) {
                      const key = `${g.away_team}@${g.home_team}`;
                      matchupCount[key] = (matchupCount[key] ?? 0) + 1;
                    }

                    return gameResults.map((g) => {
                      const matchupKey = `${g.away_team}@${g.home_team}`;
                      const isDoubleheader = (matchupCount[matchupKey] ?? 0) > 1;
                      const dhLabel = isDoubleheader
                        ? g.game_number != null
                          ? `Game ${g.game_number}`
                          : "DH"
                        : null;
                      const timeLabel = g.commence_time
                        ? new Date(g.commence_time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZoneName: "short",
                          })
                        : null;
                      return (
                        <button
                          key={g.game_pk}
                          type="button"
                          disabled={pending}
                          onClick={() => onPickGame(g)}
                          className="text-left px-2.5 py-1.5 rounded text-[11px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] flex items-center gap-2"
                        >
                          <span className="font-semibold text-[var(--color-text)]">
                            {g.away_team} @ {g.home_team}
                          </span>
                          {dhLabel && (
                            <span
                              className={`text-[9px] uppercase tracking-[0.10em] font-extrabold px-1.5 py-0.5 rounded ${
                                dhLabel === "DH"
                                  ? "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)]"
                                  : "bg-[rgba(245,197,74,0.14)] text-[var(--color-gold)]"
                              }`}
                              title={
                                dhLabel === "DH"
                                  ? "Doubleheader. MLB Stats API was unreachable so game order can't be confirmed right now."
                                  : `Doubleheader ${dhLabel} (per MLB Stats API)`
                              }
                            >
                              {dhLabel}
                            </span>
                          )}
                          {timeLabel && (
                            <span className="text-[var(--color-text-soft)] tabular-nums">
                              {timeLabel}
                            </span>
                          )}
                          <span className="text-[var(--color-text-muted)] ml-auto">
                            id {g.game_pk}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

          {lane === "market" && (
            <div className="flex flex-wrap gap-1.5">
              {MARKET_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={pending}
                  onClick={() => onPickMarket(m)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                    props.market === m
                      ? "bg-[rgba(255,255,255,0.12)] text-[var(--color-text)]"
                      : "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)] hover:bg-[rgba(255,255,255,0.10)]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {lane === "line" && (
            <div className="flex gap-2">
              <input
                type="text"
                value={lineEdit}
                onChange={(e) => setLineEdit(e.target.value)}
                placeholder="e.g. 5.5"
                className="flex-1 max-w-[140px] px-2.5 py-1.5 text-[12px] rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] tabular-nums focus:outline-none focus:border-[rgba(255,255,255,0.20)]"
              />
              <button
                type="button"
                disabled={pending}
                onClick={onSaveLine}
                className="px-3 py-1.5 rounded text-[10px] font-bold bg-[rgba(192,132,252,0.15)] text-[#c084fc] hover:bg-[rgba(192,132,252,0.25)]"
              >
                Save line
              </button>
            </div>
          )}

          {lane === "more" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Field label="Market" value={marketEdit} onChange={setMarketEdit} />
                <Field label="Line" value={lineEdit} onChange={setLineEdit} />
                <Field label="Odds" value={oddsEdit} onChange={setOddsEdit} placeholder="-110" />
                <Field label="Units" value={unitsEdit} onChange={setUnitsEdit} />
                <Field label="player_id" value={playerIdEdit} onChange={setPlayerIdEdit} />
                <Field label="game_id" value={gameIdEdit} onChange={setGameIdEdit} />
              </div>

              <div className="border-t border-[rgba(255,255,255,0.06)] pt-3">
                <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-bold mb-1.5">
                  Find player by name
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerQuery}
                    onChange={(e) => setPlayerQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && doSearchPlayer()}
                    placeholder="e.g. Framber Valdez"
                    className="flex-1 px-2.5 py-1.5 text-[12px] rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(255,255,255,0.20)]"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={doSearchPlayer}
                    className="px-3 py-1.5 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]"
                  >
                    Search
                  </button>
                </div>
                {playerResults.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    {playerResults.map((p) => (
                      <button
                        key={p.player_id}
                        type="button"
                        onClick={() => setPlayerIdEdit(String(p.player_id))}
                        className="text-left px-2.5 py-1 rounded text-[11px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] flex items-center gap-2"
                      >
                        <span className="font-semibold text-[var(--color-text)]">
                          {p.full_name}
                        </span>
                        <span className="text-[var(--color-text-muted)]">
                          {p.team_abbreviation ?? "?"}
                        </span>
                        <span className="text-[var(--color-text-muted)] ml-auto">
                          id {p.player_id}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-[9px] text-[var(--color-text-muted)] mt-1.5">
                  Click a result to populate player_id, then Save changes.
                </div>
              </div>

              <button
                type="button"
                disabled={pending}
                onClick={onSaveAllFields}
                className="self-end px-3 py-1.5 rounded text-[10px] font-extrabold uppercase bg-[rgba(192,132,252,0.15)] text-[#c084fc] hover:bg-[rgba(192,132,252,0.25)]"
              >
                Save changes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer: lane toggle + delete + close */}
      <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.06)] pt-3 flex-wrap">
        {lane !== "more" && (
          <button
            type="button"
            onClick={() => setLane("more")}
            className="text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            More options
          </button>
        )}
        {lane === "more" && defaultLane !== "none" && (
          <button
            type="button"
            onClick={() => setLane(defaultLane)}
            className="text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ← Back
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete pick ${props.pickId}? This is for parser garbage that was never a real bet.`))
              runAction(() => deletePickAction(props.pickId), "Deleted");
          }}
          className="ml-auto text-[10px] font-bold text-[var(--color-neg)] hover:underline opacity-70 hover:opacity-100"
        >
          Delete (parser garbage)
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Close
        </button>
      </div>

      {error && <div className="text-[11px] text-[var(--color-neg)]">Error: {error}</div>}
      {success && <div className="text-[11px] text-[var(--color-pos)]">{success}</div>}
    </div>
  );
}

function OutcomeButton({
  label,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  tone: "pos" | "neg" | "neutral" | "muted";
  disabled: boolean;
  onClick: () => void;
}) {
  const cls =
    tone === "pos"
      ? "bg-[var(--color-pos-soft)] text-[var(--color-pos)] hover:bg-[rgba(25,245,124,0.20)]"
      : tone === "neg"
        ? "bg-[var(--color-neg-soft)] text-[var(--color-neg)] hover:bg-[rgba(239,68,68,0.20)]"
        : tone === "neutral"
          ? "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] hover:bg-[rgba(255,255,255,0.10)]"
          : "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.10)]";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-[0.10em] disabled:opacity-50 ${cls}`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-bold">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-2 py-1 text-[11px] rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[var(--color-text)] tabular-nums focus:outline-none focus:border-[rgba(255,255,255,0.20)]"
      />
    </label>
  );
}
