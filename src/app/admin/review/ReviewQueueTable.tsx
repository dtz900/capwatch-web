"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReviewQueueItem } from "@/lib/api";
import { approvePickAction, rejectPickAction } from "./actions";

interface Props {
  items: ReviewQueueItem[];
}

export function ReviewQueueTable({ items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function runOne(pickId: number, fn: typeof approvePickAction) {
    setError(null);
    setPendingIds((prev) => new Set(prev).add(pickId));
    startTransition(async () => {
      const result = await fn(pickId);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(pickId);
        return next;
      });
      if (!result.ok) {
        setError(`pid=${pickId}: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

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
          {items.map((it) => {
            const isPending = pendingIds.has(it.id);
            return (
              <li
                key={it.id}
                className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-b border-[var(--color-border)] last:border-b-0 items-start"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
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

                <div className="flex flex-col gap-2 min-w-[120px]">
                  <button
                    type="button"
                    disabled={isPending || pending}
                    onClick={() => runOne(it.id, approvePickAction)}
                    className="px-3 py-1.5 rounded-md bg-[var(--color-pos)] text-black text-[12px] font-extrabold disabled:opacity-50 hover:opacity-90"
                  >
                    {isPending ? "..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending || pending}
                    onClick={() => runOne(it.id, rejectPickAction)}
                    className="px-3 py-1.5 rounded-md bg-[rgba(255,80,80,0.85)] text-white text-[12px] font-extrabold disabled:opacity-50 hover:opacity-100"
                  >
                    {isPending ? "..." : "Reject"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
