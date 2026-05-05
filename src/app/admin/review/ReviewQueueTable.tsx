"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReviewQueueItem } from "@/lib/api";
import {
  approvePickAction,
  bindAndApprovePickAction,
  rejectPickAction,
  searchGamesForReviewAction,
  searchPlayersForReviewAction,
  type GameSearchResult,
  type PlayerSearchResult,
} from "./actions";

interface Props {
  items: ReviewQueueItem[];
}

export function ReviewQueueTable({ items }: Props) {
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-6 py-10 text-center">
        <div className="text-[14px] text-[var(--color-text-soft)] font-medium">
          Nothing in the queue. Every parsed pick is auto-approved or rejected.
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="rounded-md border border-[rgba(255,80,80,0.4)] bg-[rgba(255,80,80,0.08)] text-[12px] text-[var(--color-neg)] font-medium px-3 py-2 mb-3">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] gap-3 px-5 py-3 border-b border-[var(--color-border)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          <div>Capper · pick · tweet</div>
          <div className="text-right">Action</div>
        </div>
        <ul>
          {items.map((it) => (
            <ReviewRow key={it.id} item={it} onError={setError} />
          ))}
        </ul>
      </div>
    </>
  );
}

interface RowProps {
  item: ReviewQueueItem;
  onError: (msg: string | null) => void;
}

function ReviewRow({ item: it, onError }: RowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  function runOne(fn: typeof approvePickAction) {
    onError(null);
    startTransition(async () => {
      const result = await fn(it.id);
      if (!result.ok) {
        onError(`pid=${it.id}: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="border-b border-[var(--color-border)] last:border-b-0">
      <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {it.capper_profile_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.capper_profile_image_url}
                alt=""
                className="w-5 h-5 rounded-full"
              />
            )}
            {it.capper_handle ? (
              <Link
                href={`/admin/cappers/${it.capper_handle}/picks`}
                className="text-[13px] font-extrabold text-[var(--color-text)] hover:underline"
              >
                @{it.capper_handle}
              </Link>
            ) : (
              <span className="text-[13px] font-extrabold text-[var(--color-text-muted)]">
                cap_id={it.capper_id}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
              pid={it.id}
            </span>
            {it.was_image_parsed && (
              <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
                image
              </span>
            )}
            {it.parlay_id && (
              <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
                parlay leg
              </span>
            )}
          </div>

          <div className="text-[13px] text-[var(--color-text)] font-semibold mb-1.5">
            {it.selection || <em className="text-[var(--color-text-muted)]">no selection</em>}
            {it.line != null && <span className="text-[var(--color-text-soft)]"> · {it.line}</span>}
            {it.odds_taken != null && (
              <span className="text-[var(--color-text-soft)]">
                {" "}
                · {it.odds_taken > 0 ? `+${it.odds_taken}` : it.odds_taken}
              </span>
            )}
            {it.units != null && (
              <span className="text-[var(--color-text-soft)]"> · {it.units}u</span>
            )}
            {it.units == null && (
              <span className="text-[var(--color-text-muted)]"> · stake unknown</span>
            )}
          </div>

          <div className="text-[11px] text-[var(--color-text-muted)] font-medium mb-2 flex items-center gap-2 flex-wrap">
            {it.market && <span>market: {it.market}</span>}
            {it.bet_kind && <span>kind: {it.bet_kind}</span>}
            {it.stat_name && <span>stat: {it.stat_name}</span>}
            {it.player_name && <span>player: {it.player_name}</span>}
            {it.parser_version && <span>parser: {it.parser_version}</span>}
          </div>

          {it.tweet_excerpt && (
            <blockquote className="text-[12px] text-[var(--color-text-soft)] font-medium border-l-2 border-[rgba(255,255,255,0.1)] pl-3 py-0.5 mt-1 whitespace-pre-line break-words">
              {it.tweet_excerpt}
            </blockquote>
          )}

          <div className="text-[10px] text-[var(--color-text-muted)] font-medium mt-2 flex items-center gap-3">
            {it.parsed_at && (
              <span className="tabular-nums">
                parsed {new Date(it.parsed_at).toLocaleString()}
              </span>
            )}
            {it.tweet_url && (
              <a
                href={it.tweet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-text-soft)] hover:text-[var(--color-text)] underline"
              >
                view tweet ↗
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-[140px]">
          <button
            type="button"
            disabled={pending}
            onClick={() => setPickerOpen((o) => !o)}
            className="px-3 py-1.5 rounded-md bg-[#3b82f6] text-white text-[12px] font-extrabold disabled:opacity-50 hover:opacity-90"
          >
            {pickerOpen ? "Cancel bind" : "Set game"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => runOne(approvePickAction)}
            className="px-3 py-1.5 rounded-md bg-[var(--color-pos)] text-black text-[12px] font-extrabold disabled:opacity-50 hover:opacity-90"
            title="Promote without binding game_id. The pick will sit ungraded if the binder can't auto-resolve the selection."
          >
            {pending ? "..." : "Approve as-is"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => runOne(rejectPickAction)}
            className="px-3 py-1.5 rounded-md bg-[rgba(255,80,80,0.85)] text-white text-[12px] font-extrabold disabled:opacity-50 hover:opacity-100"
          >
            {pending ? "..." : "Reject"}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <BindPicker
          item={it}
          onDone={() => {
            setPickerOpen(false);
            router.refresh();
          }}
          onError={(msg) => onError(`pid=${it.id}: ${msg}`)}
        />
      )}
    </li>
  );
}

interface BindPickerProps {
  item: ReviewQueueItem;
  onDone: () => void;
  onError: (msg: string) => void;
}

function BindPicker({ item, onDone, onError }: BindPickerProps) {
  const [pending, startTransition] = useTransition();

  // Default the date to the ET calendar date of posted_at. ET conversion
  // matches how the slate is anchored (a 9pm ET tweet is 1am UTC the next
  // day; we want the slate the capper was actually betting).
  const defaultDate = (() => {
    if (!item.posted_at) return new Date().toISOString().slice(0, 10);
    try {
      const d = new Date(item.posted_at);
      const et = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
      return et.toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();

  const [date, setDate] = useState(defaultDate);
  const [team, setTeam] = useState("");
  const [games, setGames] = useState<GameSearchResult[] | null>(null);
  const [searched, setSearched] = useState(false);

  const isPlayerProp = (item.bet_kind || "").toLowerCase() === "player";
  const [playerQuery, setPlayerQuery] = useState(item.player_name ?? "");
  const [players, setPlayers] = useState<PlayerSearchResult[] | null>(null);
  const [chosenPlayerId, setChosenPlayerId] = useState<number | null>(item.player_name ? null : null);

  function onSearchGames() {
    onError(""); // clear
    startTransition(async () => {
      const results = await searchGamesForReviewAction(date, team || undefined);
      setGames(results);
      setSearched(true);
    });
  }

  function onSearchPlayers() {
    startTransition(async () => {
      const results = await searchPlayersForReviewAction(playerQuery);
      setPlayers(results);
    });
  }

  function bind(gameId: string) {
    startTransition(async () => {
      const result = await bindAndApprovePickAction(
        item.id,
        gameId,
        chosenPlayerId ?? undefined,
      );
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <div className="bg-[rgba(255,255,255,0.025)] border-t border-[var(--color-border)] px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold mb-3">
        Bind game {isPlayerProp && "+ player"}
      </div>

      {isPlayerProp && (
        <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.04)]">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold mb-2">
            Player {chosenPlayerId && <span className="text-[var(--color-pos)]">· chosen</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={playerQuery}
              onChange={(e) => setPlayerQuery(e.target.value)}
              placeholder="search by name (Chase Petty, ...)"
              className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none w-72"
            />
            <button
              type="button"
              disabled={pending || !playerQuery.trim()}
              onClick={onSearchPlayers}
              className="px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] text-[12px] font-bold text-[var(--color-text)] disabled:opacity-50"
            >
              Search
            </button>
            {chosenPlayerId != null && (
              <button
                type="button"
                onClick={() => setChosenPlayerId(null)}
                className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline"
              >
                clear
              </button>
            )}
          </div>
          {players && players.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 max-h-48 overflow-y-auto">
              {players.map((p) => (
                <li key={p.player_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setChosenPlayerId(p.player_id);
                      setPlayers(null);
                    }}
                    className="text-left w-full text-[12px] text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)] px-2 py-1 rounded"
                  >
                    {p.full_name}{" "}
                    <span className="text-[var(--color-text-muted)]">
                      · {p.team_abbreviation ?? "?"} · pid={p.player_id}
                      {p.active === false && " · INACTIVE"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {players && players.length === 0 && (
            <div className="mt-2 text-[11px] text-[var(--color-text-muted)] italic">
              No players match.
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2 flex-wrap">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
            Date (ET)
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
            Team filter (optional)
          </span>
          <input
            type="text"
            value={team}
            onChange={(e) => setTeam(e.target.value.toUpperCase())}
            placeholder="NYY, LAD, ..."
            className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none w-32"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={onSearchGames}
          className="px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] text-[12px] font-bold text-[var(--color-text)] disabled:opacity-50"
        >
          {pending ? "..." : "Search games"}
        </button>
      </div>

      {searched && games && games.length === 0 && (
        <div className="mt-3 text-[12px] text-[var(--color-text-muted)] italic">
          No games match {team ? `for ${team}` : ""} on {date}.
        </div>
      )}
      {games && games.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 max-h-72 overflow-y-auto">
          {games.map((g) => {
            const t = g.commence_time
              ? new Date(g.commence_time).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })
              : "—";
            const dh = g.game_number && g.game_number > 1 ? ` · G${g.game_number}` : "";
            return (
              <li key={g.game_pk} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending || (isPlayerProp && chosenPlayerId == null)}
                  onClick={() => bind(String(g.game_pk))}
                  className="text-left flex-1 text-[12px] text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)] px-2 py-1.5 rounded border border-[rgba(255,255,255,0.04)] disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    isPlayerProp && chosenPlayerId == null
                      ? "Pick a player above first"
                      : `Bind to game_pk=${g.game_pk} and approve`
                  }
                >
                  <span className="font-bold">
                    {g.away_team} @ {g.home_team}
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    {" · "}
                    {t} ET
                    {dh}
                    {" · pk="}
                    {g.game_pk}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {isPlayerProp && chosenPlayerId == null && (
        <div className="mt-3 text-[11px] text-[var(--color-text-muted)] italic">
          Pick a player first; the bind button on each game enables once a
          player is chosen.
        </div>
      )}
    </div>
  );
}
