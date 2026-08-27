"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePickShapedFlagAction, type PickShapedFlag } from "./actions";

/** Nightly pick-shaped reconciliation queue: tweets the parser rejected
 * that look like real picks (registry team + wager token, recap-filtered
 * server-side). The pre-board skim: read the tweet, then either enter
 * the picks with "Add bet manually" above and Mark handled, or Dismiss a
 * correct reject. Empty most nights. */
export function PickShapedQueue({ flags }: { flags: PickShapedFlag[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function resolve(rawId: number, status: "dismissed" | "handled") {
    setBusyId(rawId);
    setErr(null);
    const res = await resolvePickShapedFlagAction(rawId, status);
    setBusyId(null);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    router.refresh();
  }

  if (flags.length === 0) {
    return (
      <div className="text-[12px] font-medium text-[var(--color-text-soft)]">
        Pick-shaped rejects: queue clear.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-4 space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[14px] font-bold text-[var(--color-text)]">
          Pick-shaped rejects ({flags.length})
        </h2>
        <span className="text-[11px] text-[var(--color-text-soft)]">
          rejected by the parser but shaped like real picks. Enter via Add
          bet manually, then Mark handled; or Dismiss a correct reject.
        </span>
      </div>
      {err && (
        <div className="text-[11px] font-medium text-red-400">{err}</div>
      )}
      <ul className="space-y-3">
        {flags.map((f) => (
          <li
            key={f.raw_id}
            className="rounded-md bg-[rgba(255,255,255,0.05)] p-3 space-y-2"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px]">
              <span className="font-bold text-[var(--color-text)]">
                @{f.handle ?? f.capper_id}
              </span>
              <span className="text-[var(--color-text-soft)]">
                raw {f.raw_id} ·{" "}
                {new Date(f.posted_at).toLocaleString(undefined, {
                  month: "numeric",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              {f.tweet_url && (
                <a
                  href={f.tweet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-accent)] hover:underline"
                >
                  view on X
                </a>
              )}
            </div>
            <pre className="whitespace-pre-wrap break-words text-[12px] leading-snug text-[var(--color-text)] font-sans">
              {f.tweet_text}
            </pre>
            {f.reason && (
              <div className="text-[11px] text-[var(--color-text-soft)]">
                parser: {f.reason}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busyId === f.raw_id}
                onClick={() => resolve(f.raw_id, "handled")}
                className="px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.18)]
                           text-[12px] font-bold text-[var(--color-text)] disabled:opacity-50"
              >
                Mark handled
              </button>
              <button
                type="button"
                disabled={busyId === f.raw_id}
                onClick={() => resolve(f.raw_id, "dismissed")}
                className="px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)]
                           text-[12px] font-medium text-[var(--color-text-soft)] disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
