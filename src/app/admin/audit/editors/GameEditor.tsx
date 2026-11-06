"use client";

import { useEffect, useState } from "react";
import { teamDisplayName } from "@/lib/team-names";
import { searchGamesAction, type GameSearchResult } from "../actions";
import { dateLabel, postedYmd, shiftYmd } from "./dates";
import { ErrorLine, HINT_CLASS, OPTS_CLASS, OPT_CLASS, useEditorError, type EditorProps } from "./types";

type Outcome = { kind: "ok"; results: GameSearchResult[] } | { kind: "error"; error: string };
type Status = { kind: "loading" } | Outcome;

export function defaultGameDate(p: EditorProps["p"]): string {
  const posted = postedYmd(p.posted_at);
  const fallback = posted ? (p.reason === "player_did_not_play" ? shiftYmd(posted, 1) : posted) : "";
  return p.game_date ?? fallback;
}

function timeLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
  return `${t} PT`;
}

const STEP_BTN = "border border-[var(--color-border)] rounded-md w-[26px] h-[26px] text-[var(--color-text-soft)]";

export function GameEditor({
  p,
  disabled,
  onPatch,
  pickedTeam,
}: EditorProps & { pickedTeam: string | null }) {
  const sport = p.sport ?? "MLB";
  const [date, setDate] = useState(defaultGameDate(p));
  const [loaded, setLoaded] = useState<{ key: string; outcome: Outcome } | null>(null);
  const key = `${sport}|${date}`;
  const status: Status = loaded && loaded.key === key ? loaded.outcome : { kind: "loading" };
  const { error, run } = useEditorError(onPatch);

  useEffect(() => {
    if (!date) return;
    let live = true;
    searchGamesAction(date, undefined, sport).then((r) => {
      if (live) setLoaded({ key, outcome: r.ok ? { kind: "ok", results: r.results } : { kind: "error", error: r.error } });
    });
    return () => {
      live = false;
    };
  }, [date, sport, key]);

  const isHis = (g: GameSearchResult) =>
    pickedTeam != null && (g.away_team === pickedTeam || g.home_team === pickedTeam);
  const rows = status.kind === "ok" ? [...status.results].sort((a, b) => Number(isHis(b)) - Number(isHis(a))) : [];

  const bind = (g: GameSearchResult) => {
    const name = `${teamDisplayName(g.away_team, sport)} @ ${teamDisplayName(g.home_team, sport)}`;
    return run({ game_id: String(g.game_pk) }, `Set game ${name}`, true, { gameDate: g.game_date ?? date });
  };

  return (
    <div>
      {date ? (
        <div className="inline-flex items-center gap-2.5 font-extrabold text-[13px]">
          <button type="button" aria-label="Previous day" onClick={() => setDate(shiftYmd(date, -1))} className={STEP_BTN}>
            ‹
          </button>
          <span>{dateLabel(date)}</span>
          <button type="button" aria-label="Next day" onClick={() => setDate(shiftYmd(date, 1))} className={STEP_BTN}>
            ›
          </button>
        </div>
      ) : (
        <div className={HINT_CLASS}>No posted date to start from.</div>
      )}
      {status.kind === "error" && (
        <div className="mt-2 text-[12px] font-semibold text-[var(--color-neg)]">Game search failed: {status.error}</div>
      )}
      {date && status.kind === "ok" && rows.length === 0 && (
        <div className={`${HINT_CLASS} mt-2`}>No {sport} games on this date.</div>
      )}
      {rows.length > 0 && (
        <div className={OPTS_CLASS}>
          {rows.map((g) => {
            const his = isHis(g);
            const sub = [timeLabel(g.commence_time), g.game_number === 2 ? "Game 2" : null].filter(Boolean).join(" · ");
            return (
              <button key={g.game_pk} type="button" disabled={disabled} onClick={() => bind(g)} className={OPT_CLASS}>
                <span className="font-extrabold text-[13.5px]">
                  {teamDisplayName(g.away_team, sport)} @ {teamDisplayName(g.home_team, sport)}
                </span>
                <span className="text-[12px] font-semibold text-[var(--color-text-muted)] tabular-nums">{sub}</span>
                <span
                  className={`text-[11.5px] font-extrabold ${his ? "text-[var(--color-pos)]" : "text-[var(--color-text-soft)]"}`}
                >
                  {his ? "His team · bind" : "Bind"}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <ErrorLine error={error} />
    </div>
  );
}
