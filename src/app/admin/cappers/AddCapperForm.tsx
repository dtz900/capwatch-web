"use client";

import { useState, useTransition } from "react";
import { addCapperAction, type AddCapperResult } from "./actions";

const STATUS_LABEL: Record<"added" | "reactivated" | "already_tracking", string> = {
  added: "Added",
  reactivated: "Reactivated",
  already_tracking: "Already tracked",
};

const STATUS_TONE: Record<"added" | "reactivated" | "already_tracking", string> = {
  added: "bg-[var(--color-pos-soft)] text-[var(--color-pos)]",
  reactivated: "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)]",
  already_tracking: "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)]",
};

export function AddCapperForm() {
  const [handle, setHandle] = useState("");
  const [tier, setTier] = useState<1 | 2 | 3>(2);
  const [displayName, setDisplayName] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<AddCapperResult | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await addCapperAction({
        handle,
        tier,
        display_name: displayName || undefined,
        notes: notes || undefined,
      });
      setResult(res);
      if (res.ok) {
        setHandle("");
        setDisplayName("");
        setNotes("");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3 items-end">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
            X handle
          </span>
          <div className="mt-1.5 flex items-center rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] focus-within:border-[rgba(255,255,255,0.20)]">
            <span className="pl-3 pr-1 text-[var(--color-text-muted)] text-sm font-semibold">@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="handle"
              required
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              className="flex-1 bg-transparent py-2 pr-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
            Tier
          </span>
          <select
            value={tier}
            onChange={(e) => setTier(Number(e.target.value) as 1 | 2 | 3)}
            disabled={pending}
            className="mt-1.5 w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[rgba(255,255,255,0.20)]"
          >
            <option value={1}>1 (sharp)</option>
            <option value={2}>2 (emerging)</option>
            <option value={3}>3 (paid tout)</option>
          </select>
        </label>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]">
          Optional fields
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
              Display name
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={pending}
              className="mt-1.5 w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[rgba(255,255,255,0.20)]"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
              Recon notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={pending}
              className="mt-1.5 w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[rgba(255,255,255,0.20)]"
            />
          </label>
        </div>
      </details>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !handle.trim()}
          className="px-4 py-2 rounded-md bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.16)] disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-bold text-[var(--color-text)]"
        >
          {pending ? "Adding..." : "Add capper"}
        </button>
        <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
          Inserts row, refreshes X stream rule, resolves twitter_user_id.
        </span>
      </div>

      {result && (
        <div className="mt-4 rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.25)] px-4 py-3 text-[12px]">
          {result.ok ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-[0.10em] ${STATUS_TONE[result.status]}`}
                >
                  {STATUS_LABEL[result.status]}
                </span>
                <span className="font-semibold text-[var(--color-text)]">
                  @{result.capper.handle}
                </span>
                <span className="text-[var(--color-text-muted)]">id={result.capper.id}</span>
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] font-medium">
                tier={result.capper.tier ?? "—"} · twitter_user_id=
                {result.capper.twitter_user_id ?? <span className="text-[var(--color-neg)]">unresolved</span>}
              </div>
              {result.status === "added" && !result.capper.twitter_user_id && (
                <div className="text-[11px] text-[var(--color-neg)] font-medium">
                  Handle did not resolve on X. Row inserted but no tweets will ingest until corrected.
                </div>
              )}
            </div>
          ) : (
            <div className="text-[var(--color-neg)] font-semibold">{result.error}</div>
          )}
        </div>
      )}
    </form>
  );
}
