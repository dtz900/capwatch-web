"use client";

import { useEffect, useState } from "react";
import { leadingToken } from "../teamMatch";
import { searchPlayersAction, type PlayerSearchResult } from "../actions";
import { ErrorLine, HINT_CLASS, INPUT_CLASS, OPTS_CLASS, OPT_CLASS, useEditorError, type EditorProps } from "./types";

type Status =
  | { kind: "idle" }
  | { kind: "ok"; results: PlayerSearchResult[]; missing: string[] }
  | { kind: "error"; error: string };

export function PlayerEditor({
  p,
  disabled,
  onPatch,
}: EditorProps) {
  const sport = p.sport ?? "MLB";
  const [q, setQ] = useState(p.player_name ?? (leadingToken(p.selection) || (p.selection ?? "")));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { error, run } = useEditorError(onPatch);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      searchPlayersAction(q, sport).then((r) => {
        if (!live) return;
        setStatus(
          r.ok ? { kind: "ok", results: r.results, missing: r.missingTeams } : { kind: "error", error: r.error },
        );
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, sport]);

  const attach = async (r: PlayerSearchResult) => {
    await run({ player_id: r.player_id }, `Set player ${r.full_name}`, true, {
      team: r.team_abbreviation,
      name: r.full_name,
    });
  };

  return (
    <div>
      <div className={`${HINT_CLASS} mb-2`}>Searching the {sport} roster</div>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={`${INPUT_CLASS} w-[260px]`}
        aria-label="Player search"
      />
      {status.kind === "error" && (
        <div className="mt-2 text-[12px] font-semibold text-[var(--color-neg)]">
          Player search failed: {status.error}
        </div>
      )}
      {status.kind === "ok" && status.missing.length > 0 && (
        <div className={`${HINT_CLASS} mt-2`}>Rosters for {status.missing.join(", ")} did not load</div>
      )}
      {status.kind === "ok" && status.results.length === 0 && q.trim() !== "" && (
        <div className={`${HINT_CLASS} mt-2`}>No {sport} player matches. Try the surname only.</div>
      )}
      {status.kind === "ok" && status.results.length > 0 && (
        <div className={OPTS_CLASS}>
          {status.results.map((r) => (
            <button key={r.player_id} type="button" disabled={disabled} onClick={() => attach(r)} className={OPT_CLASS}>
              <span className="font-extrabold text-[13.5px]">
                {[r.full_name, r.team_abbreviation, r.position].filter(Boolean).join(" · ")}
              </span>
              <span />
              <span className="text-[11.5px] font-extrabold text-[var(--color-text-soft)]">Attach</span>
            </button>
          ))}
        </div>
      )}
      <ErrorLine error={error} />
    </div>
  );
}
