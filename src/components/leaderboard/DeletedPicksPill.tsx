"use client";

import { useEffect, useRef, useState } from "react";
import { fetchDeletedPicks, type DeletedPick } from "@/lib/api";

interface Props {
  count: number;
  /** Capper handle (no @). Required to lazy-load the deleted-picks list. */
  handle?: string;
}

export function DeletedPicksPill({ count, handle }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DeletedPick[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || items != null || !handle) return;
    setLoading(true);
    setError(null);
    fetchDeletedPicks(handle)
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, handle, items]);

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

  if (!count || count <= 0) return null;

  // Without a handle we fall back to the original tooltip-only pill (e.g.
  // older call sites that don't yet pass it). The clickable variant only
  // activates when the caller can route to a specific capper.
  if (!handle) {
    return (
      <span
        title={`${count} parsed pick${count === 1 ? "" : "s"} where the source tweet was deleted from X.`}
        className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.12em]
                   bg-[rgba(239,68,68,0.10)] text-[var(--color-neg)]
                   border border-[rgba(239,68,68,0.30)]
                   px-1.5 py-0.5 rounded cursor-help"
      >
        <span className="leading-none">×</span>
        <span>{count} deleted</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={`${count} deleted picks. Click for details.`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.12em]
                   bg-[rgba(239,68,68,0.10)] text-[var(--color-neg)]
                   border border-[rgba(239,68,68,0.30)]
                   px-1.5 py-0.5 rounded hover:bg-[rgba(239,68,68,0.18)] cursor-pointer"
      >
        <span className="leading-none">×</span>
        <span>{count} deleted</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-10 overflow-y-auto"
          aria-modal="true"
          role="dialog"
        >
          <div
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-xl border border-[rgba(255,255,255,0.10)]
                       bg-[var(--color-surface)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-5 py-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
                  Deleted picks
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
              These picks were captured live from X, then the original tweets
              were later deleted by the capper. Picks are still graded against
              the final outcome. Items tagged{" "}
              <span className="text-[var(--color-text-soft)] font-semibold">
                possible duplicate
              </span>{" "}
              have an identical still-live pick from the same capper within{" "}
              <span className="tabular-nums">24h</span>, suggesting an edit or
              re-post rather than an outright deletion.
            </div>

            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
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
              {items && items.length === 0 && (
                <div className="text-[12px] text-[var(--color-text-muted)]">
                  No deleted picks on record.
                </div>
              )}
              {items && items.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {items.map((p) => (
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
  return (
    <li
      className={`rounded-lg border p-3 ${
        pick.likely_duplicate_of != null
          ? "border-[rgba(245,197,74,0.25)] bg-[rgba(245,197,74,0.04)]"
          : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
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
        {pick.likely_duplicate_of != null && (
          <span
            title={`Identical still-live pick id ${pick.likely_duplicate_of} within 24h`}
            className="ml-auto text-[9px] uppercase tracking-[0.10em] font-extrabold
                       text-[var(--color-gold)] bg-[rgba(245,197,74,0.12)]
                       border border-[rgba(245,197,74,0.30)] px-1.5 py-0.5 rounded"
          >
            possible duplicate
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
