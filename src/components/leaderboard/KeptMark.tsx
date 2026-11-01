"use client";

import { useEffect, useRef, useState } from "react";
import { fetchDeletedPicks, type DeletedPick, type DeletedPicksResponse } from "@/lib/api";

interface Props {
  /** Deleted slips (tweets that had parsed picks), repost-replaced ones excluded. */
  deletedCount: number;
  /** Slips parsed for this capper, all time. */
  tweetsParsed: number | null | undefined;
  /** Graded picks in the row's window; the mark needs 20 to mean anything. */
  picksCount: number | null | undefined;
  /** Capper handle (no @). Required to lazy-load the deleted-picks list. */
  handle?: string;
  size?: "sm" | "md";
}

/** Kept rate, floored to one decimal so one deletion never rounds up to 100. */
export function keptRate(deletedCount: number, tweetsParsed: number): number {
  const kept = Math.max(0, tweetsParsed - deletedCount) / tweetsParsed;
  return Math.floor(kept * 1000) / 10;
}

export const KEPT_MIN_PICKS = 20;
export const KEPT_NEAR_MIN = 95;

type KeptState = "full" | "near" | "low";

export function keptState(deletedCount: number, tweetsParsed: number): KeptState {
  if (deletedCount <= 0) return "full";
  return keptRate(deletedCount, tweetsParsed) >= KEPT_NEAR_MIN ? "near" : "low";
}

/** The bet-slip mark: solid green at 100% kept, hollow and muted from 95% up,
 *  red with the rate as text below that. Icon only until it's bad. */
function SlipIcon({ state, size }: { state: KeptState; size: number }) {
  const stroke = state === "full" ? "var(--color-pos)" : state === "near" ? "var(--color-text-muted)" : "var(--color-neg)";
  const fill = state === "full" ? "var(--color-pos)" : "none";
  const ink = state === "full" ? "#06270f" : stroke;
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      aria-hidden="true"
      style={state === "full" ? { filter: "drop-shadow(0 0 5px rgba(25,245,124,0.45))", overflow: "visible" } : { overflow: "visible" }}
    >
      <path d="M5 1.5h10v15.5l-1.7-1.3-1.6 1.3-1.7-1.3-1.7 1.3-1.6-1.3L5 17z" fill={fill} stroke={stroke} strokeWidth={state === "full" ? 1 : 1.6} />
      {state === "low" ? (
        <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
      ) : (
        <path d="M7.2 9.4l1.9 1.9 3.8-4" fill="none" stroke={ink} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function KeptMark({ deletedCount, tweetsParsed, picksCount, handle, size = "md" }: Props) {
  const count = deletedCount;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DeletedPicksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Loading is derived rather than a separate useState so we don't have to
  // call setLoading synchronously inside the effect body (React 19's
  // react-hooks/set-state-in-effect rule). It's true while the dialog is
  // open and we don't yet have either a result or an error.
  const loading = open && !!handle && data == null && error == null;

  useEffect(() => {
    if (!open || data != null || error != null || !handle) return;
    let cancelled = false;
    fetchDeletedPicks(handle)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => {
      cancelled = true;
    };
  }, [open, handle, data, error]);

  // Close on Escape; close on click-outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!dialogRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    setTimeout(() => window.addEventListener("click", onClick), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [open]);

  const parsed = tweetsParsed ?? 0;
  if ((picksCount ?? 0) < KEPT_MIN_PICKS || parsed <= 0) return null;

  const state = keptState(count, parsed);
  const px = size === "md" ? 18 : 15;
  // The count is SLIPS (deleted tweets that had parsed picks), not
  // individual picks: a deleted 15-leg parlay slip counts once.
  const tip =
    state === "full"
      ? `100% kept: all ${parsed} slips still up.`
      : `${keptRate(count, parsed)}% kept: ${count} of ${parsed} slips deleted from X after the picks were parsed. Deleted picks stay graded.`;

  if (state === "full" || !handle) {
    return (
      <span title={tip} aria-label={tip} className="inline-flex items-center shrink-0 cursor-help leading-none">
        <SlipIcon state={state} size={px} />
      </span>
    );
  }

  const lowCls = size === "md" ? "text-[11px]" : "text-[10px]";
  return (
    <>
      <button
        type="button"
        title={tip}
        aria-label={`${tip} Click for details.`}
        onClick={(e) => {
          // Both guards matter: the mark renders inside whole-row <Link>
          // anchors on /cappers, where an unprevented click navigates.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          state === "low"
            ? `inline-flex items-center gap-1 ${lowCls} font-extrabold tracking-[0.02em]
               bg-[rgba(239,68,68,0.08)] text-[var(--color-neg)] border border-[rgba(239,68,68,0.45)]
               pl-1 pr-2 py-0.5 rounded-full hover:bg-[rgba(239,68,68,0.16)] cursor-pointer leading-none`
            : "inline-flex items-center shrink-0 leading-none cursor-pointer hover:opacity-80"
        }
      >
        <SlipIcon state={state} size={px} />
        {state === "low" && <span>{keptRate(count, parsed)}% kept</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 backdrop-blur-sm px-4 py-10 overflow-y-auto"
          aria-modal="true"
          role="dialog"
          onClick={(e) => e.preventDefault()}
        >
          <div
            ref={dialogRef}
            onClick={(e) => {
              // preventDefault so clicks inside the dialog can't trigger a
              // wrapping <Link>'s navigation (/cappers rows are anchors).
              e.preventDefault();
              e.stopPropagation();
            }}
            className="w-full max-w-2xl rounded-xl border border-[rgba(255,255,255,0.10)]
                       bg-[#15151a] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-5 py-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
                  Deleted slips
                </div>
                <div className="text-[13px] font-bold text-[var(--color-text)] mt-0.5">
                  @{handle}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-3 text-[11px] text-[var(--color-text-muted)] leading-relaxed border-b border-[rgba(255,255,255,0.04)]">
              These picks were captured live from X. Picks tagged{" "}
              <span className="text-[var(--color-pos)] font-semibold">reposted</span>{" "}
              were followed by a same-content tweet from the same capper within
              an hour (effectively an edit, not a deletion). Picks tagged{" "}
              <span className="text-[var(--color-neg)] font-semibold">removed</span>{" "}
              are no longer accessible on X. All picks remain graded against the
              final outcome.
            </div>

            {data && data.summary && (() => {
              // The pill counts SLIPS (deleted tweets), so the breakdown
              // must too. Items are individual picks; group by raw_id. A
              // slip is "reposted" when its picks carry a replacement URL.
              const reposted = new Set<number>();
              const removed = new Set<number>();
              for (const p of data.items) {
                (p.replacement_tweet_url != null ? reposted : removed).add(p.raw_id);
              }
              return (
                <div className="px-5 py-3 flex items-center gap-4 border-b border-[rgba(255,255,255,0.04)] text-[11px] flex-wrap">
                  <span className="text-[var(--color-text-muted)] uppercase tracking-[0.10em] font-bold">
                    Breakdown
                  </span>
                  <span className="text-[var(--color-pos)] tabular-nums font-bold">
                    {reposted.size} slip{reposted.size === 1 ? "" : "s"} reposted
                  </span>
                  <span className="text-[var(--color-neg)] tabular-nums font-bold">
                    {removed.size} slip{removed.size === 1 ? "" : "s"} removed
                  </span>
                  <span className="text-[var(--color-text-muted)] tabular-nums ml-auto">
                    {data.summary.total} pick{data.summary.total === 1 ? "" : "s"} total
                  </span>
                </div>
              );
            })()}

            <div className="scrollbar-subtle px-5 py-4 max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="text-[12px] text-[var(--color-text-muted)] italic">
                  Loading...
                </div>
              )}
              {error && (
                <div className="text-[12px] text-[var(--color-neg)]">
                  Failed to load: {error}
                </div>
              )}
              {data && data.items.length === 0 && (
                <div className="text-[12px] text-[var(--color-text-muted)]">
                  No deleted picks on record.
                </div>
              )}
              {data && data.items.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {data.items.map((p) => (
                    <DeletedPickRow key={p.id} pick={p} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DeletedPickRow({ pick }: { pick: DeletedPick }) {
  const odds =
    pick.odds_taken == null
      ? null
      : pick.odds_taken > 0
        ? `+${pick.odds_taken}`
        : String(pick.odds_taken);
  const lineLabel = pick.line == null ? null : pick.line;
  const posted = new Date(pick.posted_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const isParlayLeg = pick.parlay_id != null;
  const isReposted = pick.replacement_tweet_url != null;
  return (
    <li
      className={`rounded-lg border p-3 ${
        isReposted
          ? "border-[rgba(25,245,124,0.20)] bg-[rgba(25,245,124,0.03)]"
          : pick.likely_duplicate_of != null
            ? "border-[rgba(245,197,74,0.25)] bg-[rgba(245,197,74,0.04)]"
            : "border-[rgba(239,68,68,0.20)] bg-[rgba(239,68,68,0.03)]"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {pick.market && (
          <span className="text-[9px] uppercase tracking-[0.12em] font-extrabold text-[var(--color-text-muted)] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">
            {pick.market}
          </span>
        )}
        <span className="text-[12px] font-semibold text-[var(--color-text)]">
          {pick.selection ?? "(no selection)"}
        </span>
        {lineLabel != null && (
          <span className="text-[11px] tabular-nums text-[var(--color-text-soft)]">
            {lineLabel}
          </span>
        )}
        {odds && (
          <span className="text-[11px] tabular-nums text-[var(--color-text-soft)]">
            {odds}
          </span>
        )}
        {isParlayLeg && (
          <span className="text-[9px] uppercase tracking-[0.10em] font-bold text-[var(--color-text-muted)]">
            parlay leg
          </span>
        )}
        {isReposted ? (
          <a
            href={pick.replacement_tweet_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Same body re-tweeted within an hour. Click to view the live replacement."
            className="ml-auto text-[9px] uppercase tracking-[0.10em] font-extrabold
                       text-[var(--color-pos)] bg-[rgba(25,245,124,0.10)]
                       border border-[rgba(25,245,124,0.30)] px-1.5 py-0.5 rounded
                       hover:bg-[rgba(25,245,124,0.16)]"
          >
            reposted →
          </a>
        ) : pick.likely_duplicate_of != null ? (
          <span
            title={`Identical still-live pick id ${pick.likely_duplicate_of} within 24h`}
            className="ml-auto text-[9px] uppercase tracking-[0.10em] font-extrabold
                       text-[var(--color-gold)] bg-[rgba(245,197,74,0.12)]
                       border border-[rgba(245,197,74,0.30)] px-1.5 py-0.5 rounded"
          >
            possible duplicate
          </span>
        ) : (
          <span
            title="Source tweet is no longer accessible on X and no replacement was found within the hour after."
            className="ml-auto text-[9px] uppercase tracking-[0.10em] font-extrabold
                       text-[var(--color-neg)] bg-[rgba(239,68,68,0.10)]
                       border border-[rgba(239,68,68,0.30)] px-1.5 py-0.5 rounded"
          >
            removed
          </span>
        )}
      </div>
      {pick.tweet_body && (
        <div className="text-[11px] text-[var(--color-text-muted)] mt-2 leading-relaxed italic">
          {pick.tweet_body}
        </div>
      )}
      <div className="text-[10px] text-[var(--color-text-muted)] mt-2 tabular-nums">
        Posted {posted}
      </div>
    </li>
  );
}
