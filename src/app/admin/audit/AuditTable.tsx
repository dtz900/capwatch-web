"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuditProblem } from "@/lib/api";
import { batchDeletePicksAction, batchRegradePicksAction } from "./actions";
import { FixPanel } from "./FixPanel";

const REASON_LABEL: Record<string, string> = {
  market_unhandled: "Market not in grader",
  missing_player_id: "Player not resolved",
  missing_line: "Line missing",
  missing_game_id: "Game not resolved",
  game_pending: "Game pending",
  no_grade_row: "Grader hasn't run",
  player_did_not_play: "Player didn't play",
  data_gap: "Game data gap",
};

const BENIGN_REASONS = new Set(["player_did_not_play", "game_pending"]);

interface Props {
  problems: AuditProblem[];
}

export function AuditTable({ problems }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state is reset by the parent passing a fresh `key` when filters
  // change (see audit/page.tsx). That avoids a setState-in-effect dance here.

  const visibleIds = problems.map((p) => p.pick_id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));

  function toggleOne(pickId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pickId)) next.delete(pickId);
      else next.add(pickId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
    setError(null);
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selected.size} pick${selected.size === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!confirmed) return;
    setPending(true);
    setError(null);
    const res = await batchDeletePicksAction([...selected]);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  async function handleBatchRegrade() {
    if (selected.size === 0) return;
    setPending(true);
    setError(null);
    const res = await batchRegradePicksAction([...selected]);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <>
      <section className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div
          className="grid grid-cols-[28px_80px_120px_140px_1fr_60px_30px] gap-3 items-center px-4 py-2.5
                     bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-border)]
                     text-[10px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]"
        >
          <SelectAllCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected && !allVisibleSelected}
            onChange={toggleAllVisible}
            disabled={problems.length === 0}
          />
          <div>Date</div>
          <div>Capper</div>
          <div>Reason</div>
          <div>Pick</div>
          <div className="text-right">Market</div>
          <div />
        </div>

        {problems.length === 0 ? (
          <div className="px-6 py-10 text-center text-[13px] text-[var(--color-text-muted)] italic">
            Nothing matches these filters.
          </div>
        ) : (
          problems.map((p) => (
            <ProblemRow
              key={p.pick_id}
              p={p}
              checked={selected.has(p.pick_id)}
              onToggle={() => toggleOne(p.pick_id)}
            />
          ))
        )}
      </section>

      {selected.size > 0 && (
        <div
          role="toolbar"
          aria-label="Batch actions"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                     flex items-center gap-3 px-4 py-3 rounded-xl
                     border border-[rgba(239,68,68,0.30)] bg-[#0a0a0a]
                     shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        >
          <span className="text-[13px] font-bold tabular-nums text-[var(--color-text)]">
            {selected.size} selected
          </span>
          {error && (
            <span className="text-[12px] font-medium text-[var(--color-neg)] max-w-[260px] truncate">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="text-[12px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                       px-2 py-1 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBatchRegrade}
            disabled={pending}
            title="Clear existing grades so the grader cron re-runs on these picks"
            className="px-3 py-1.5 rounded-md bg-[rgba(96,165,250,0.18)] hover:bg-[rgba(96,165,250,0.28)]
                       text-[#93c5fd] text-[12px] font-bold disabled:opacity-50"
          >
            {pending ? "Working..." : `Regrade ${selected.size}`}
          </button>
          <button
            type="button"
            onClick={handleBatchDelete}
            disabled={pending}
            className="px-3 py-1.5 rounded-md bg-[var(--color-neg)] hover:opacity-90
                       text-white text-[12px] font-bold disabled:opacity-50"
          >
            {pending ? "Working..." : `Delete ${selected.size}`}
          </button>
        </div>
      )}
    </>
  );
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label="Select all visible"
      className="cursor-pointer accent-[var(--color-neg)] disabled:opacity-30 disabled:cursor-not-allowed"
    />
  );
}

function ProblemRow({
  p,
  checked,
  onToggle,
}: {
  p: AuditProblem;
  checked: boolean;
  onToggle: () => void;
}) {
  const postedDate = p.posted_at
    ? new Date(p.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const gameDate = p.game_date
    ? new Date(p.game_date + "T12:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;
  // Flag a mismatch when the linked game's date is more than 1 day off from
  // the tweet date. Doubleheader misattribution typically shows here.
  const dateMismatch = (() => {
    if (!p.posted_at || !p.game_date) return false;
    const postedDay = p.posted_at.slice(0, 10);
    return p.game_date < postedDay;
  })();
  const reasonLabel = REASON_LABEL[p.reason] ?? p.reason;
  const benign = BENIGN_REASONS.has(p.reason);
  const reasonColor = benign
    ? "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)]"
    : p.kind === "void"
      ? "bg-[var(--color-neg-soft)] text-[var(--color-neg)]"
      : "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)]";
  return (
    <div
      className={`border-b border-[rgba(255,255,255,0.03)] last:border-b-0 px-4 py-3 transition-colors ${
        checked ? "bg-[rgba(239,68,68,0.05)]" : ""
      }`}
    >
      <div className="grid grid-cols-[28px_80px_120px_140px_1fr_60px_50px] gap-3 items-start text-[12px]">
        <div className="self-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            aria-label={`Select pick ${p.pick_id}`}
            className="cursor-pointer accent-[var(--color-neg)]"
          />
        </div>
        <div className="font-medium tabular-nums">
          {gameDate ? (
            <div
              className={dateMismatch ? "text-[var(--color-gold)]" : "text-[var(--color-text-soft)]"}
              title={
                dateMismatch
                  ? `Game date (${gameDate}) is earlier than tweet date (${postedDate}). Likely parser misattributed the game — common for doubleheaders. Use the FIX panel to repick the game.`
                  : "Date of the linked game"
              }
            >
              {gameDate}
              {dateMismatch && <span className="ml-1" aria-hidden="true">⚠</span>}
            </div>
          ) : (
            <div className="text-[var(--color-text-muted)]">—</div>
          )}
          {postedDate && (
            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5" title="Tweet posted date">
              tw {postedDate}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <Link
            href={p.capper_handle ? `/cappers/${p.capper_handle}` : "#"}
            className="font-semibold truncate text-[var(--color-text)] hover:underline block"
          >
            {p.capper_display_name ?? p.capper_handle ?? "—"}
          </Link>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            @{p.capper_handle ?? "—"}
          </div>
        </div>
        <div>
          <span
            className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-[0.10em] ${reasonColor}`}
          >
            {reasonLabel}
          </span>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
            pid={p.pick_id}
            {p.parlay_id != null && <span className="ml-1">· parlay {p.parlay_id}</span>}
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-[var(--color-text)] truncate">
            {p.selection ?? p.market ?? "—"}
          </div>
          {p.tweet_text && (
            <div className="text-[10px] text-[var(--color-text-muted)] mt-1 leading-snug line-clamp-2">
              {p.tweet_text}
            </div>
          )}
        </div>
        <div className="text-right text-[var(--color-text-soft)] font-medium">
          {p.market ?? "—"}
        </div>
        <div className="text-right flex flex-col gap-1.5 items-end">
          {p.tweet_url && (
            <a
              href={p.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[12px] font-bold"
              aria-label="Open tweet"
            >
              ↗
            </a>
          )}
        </div>
      </div>
      <FixPanel
        pickId={p.pick_id}
        reason={p.reason}
        market={p.market}
        selection={p.selection}
        line={p.line}
        oddsTaken={p.odds_taken}
        units={p.units}
        playerId={p.player_id}
        gameId={p.game_id}
        postedAt={p.posted_at}
      />
    </div>
  );
}
