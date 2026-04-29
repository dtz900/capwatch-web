"use client";

import { useState, useTransition } from "react";
import {
  patchPickAction,
  manualGradeAction,
  regradeAction,
  deletePickAction,
  searchPlayersAction,
  searchGamesAction,
  type PlayerSearchResult,
  type GameSearchResult,
} from "./actions";

interface Props {
  pickId: number;
  market: string | null;
  selection: string | null;
  line: number | null;
  oddsTaken: number | null;
  units: number | null;
  playerId: number | null;
  gameId: string | null;
  postedAt: string | null;
}

export function FixPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [marketEdit, setMarketEdit] = useState(props.market ?? "");
  const [lineEdit, setLineEdit] = useState(props.line == null ? "" : String(props.line));
  const [oddsEdit, setOddsEdit] = useState(props.oddsTaken == null ? "" : String(props.oddsTaken));
  const [unitsEdit, setUnitsEdit] = useState(props.units == null ? "" : String(props.units));
  const [playerIdEdit, setPlayerIdEdit] = useState(props.playerId == null ? "" : String(props.playerId));
  const [gameIdEdit, setGameIdEdit] = useState(props.gameId ?? "");

  const [playerQuery, setPlayerQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<PlayerSearchResult[]>([]);
  const [gameResults, setGameResults] = useState<GameSearchResult[]>([]);

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

  const onSaveEdits = () => {
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
    runAction(() => patchPickAction(props.pickId, patch), "Saved + cleared grade");
  };

  const onSearchPlayer = () => {
    if (!playerQuery.trim()) return;
    startTransition(async () => {
      const r = await searchPlayersAction(playerQuery);
      setPlayerResults(r);
    });
  };

  const onLookupGames = () => {
    if (!props.postedAt) {
      flash("No posted_at to derive date", false);
      return;
    }
    const d = new Date(props.postedAt);
    const ymd = d.toISOString().slice(0, 10);
    startTransition(async () => {
      const r = await searchGamesAction(ymd);
      setGameResults(r);
    });
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
    <div className="mt-3 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-3 text-[11px] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
          Fix pick {props.pickId}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] font-bold"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onMarkOutcome("win")}
          className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase bg-[var(--color-pos-soft)] text-[var(--color-pos)] hover:bg-[rgba(25,245,124,0.20)]"
        >
          Mark Win
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onMarkOutcome("loss")}
          className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase bg-[var(--color-neg-soft)] text-[var(--color-neg)] hover:bg-[rgba(239,68,68,0.20)]"
        >
          Mark Loss
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onMarkOutcome("push")}
          className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] hover:bg-[rgba(255,255,255,0.10)]"
        >
          Push
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onMarkOutcome("void")}
          className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.10)]"
        >
          Void
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => runAction(() => regradeAction(props.pickId), "Cleared, will regrade on cron")}
          className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] hover:bg-[rgba(255,255,255,0.10)]"
        >
          Regrade
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Hard-delete pick ${props.pickId}?`))
              runAction(() => deletePickAction(props.pickId), "Deleted");
          }}
          className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase bg-[rgba(239,68,68,0.10)] text-[var(--color-neg)] hover:bg-[rgba(239,68,68,0.20)] ml-auto"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Field label="Market" value={marketEdit} onChange={setMarketEdit} placeholder="ML / total / prop_pitcher_k" />
        <Field label="Line" value={lineEdit} onChange={setLineEdit} placeholder="number" />
        <Field label="Odds (American)" value={oddsEdit} onChange={setOddsEdit} placeholder="-110 / +135" />
        <Field label="Units" value={unitsEdit} onChange={setUnitsEdit} placeholder="1 / 2" />
        <Field label="player_id" value={playerIdEdit} onChange={setPlayerIdEdit} placeholder="660271" />
        <Field label="game_id (game_pk)" value={gameIdEdit} onChange={setGameIdEdit} placeholder="824608" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={playerQuery}
          onChange={(e) => setPlayerQuery(e.target.value)}
          placeholder="Search player..."
          className="px-2 py-1 text-[11px] rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(255,255,255,0.20)]"
        />
        <button
          type="button"
          disabled={pending}
          onClick={onSearchPlayer}
          className="px-2.5 py-1 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]"
        >
          Find player
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onLookupGames}
          className="px-2.5 py-1 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]"
        >
          List games on date
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onSaveEdits}
          className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase bg-[rgba(192,132,252,0.15)] text-[#c084fc] hover:bg-[rgba(192,132,252,0.25)] ml-auto"
        >
          Save edits + clear grade
        </button>
      </div>

      {playerResults.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {playerResults.map((p) => (
            <button
              key={p.player_id}
              type="button"
              onClick={() => setPlayerIdEdit(String(p.player_id))}
              className="px-2 py-0.5 rounded text-[10px] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]"
            >
              {p.full_name} <span className="text-[var(--color-text-muted)]">({p.team_abbreviation ?? "?"} · {p.player_id})</span>
            </button>
          ))}
        </div>
      )}
      {gameResults.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {gameResults.map((g) => (
            <button
              key={g.game_pk}
              type="button"
              onClick={() => setGameIdEdit(String(g.game_pk))}
              className="px-2 py-0.5 rounded text-[10px] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.10)] text-[var(--color-text-soft)]"
            >
              {g.away_team} @ {g.home_team} <span className="text-[var(--color-text-muted)]">({g.game_pk})</span>
            </button>
          ))}
        </div>
      )}

      {error && <div className="text-[11px] text-[var(--color-neg)]">Error: {error}</div>}
      {success && <div className="text-[11px] text-[var(--color-pos)]">{success}</div>}
    </div>
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
