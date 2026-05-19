"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PalaceCandidate } from "@/lib/types";
import { enrichAction, publishAction, unpublishAction } from "./actions";

export function PalaceQueueTable({ items }: { items: PalaceCandidate[] }) {
  const [error, setError] = useState<string | null>(null);
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-6 py-10 text-center text-[14px] text-[var(--color-text-soft)]">
        No winning parlays to curate.
      </div>
    );
  }
  return (
    <>
      {error && (
        <div className="rounded-md border border-[rgba(255,80,80,0.4)] bg-[rgba(255,80,80,0.08)] text-[12px] text-[var(--color-neg)] px-3 py-2 mb-3">
          {error}
        </div>
      )}
      <ul className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
        {items.map((it) => (
          <Row key={it.parlay_id} it={it} onError={setError} />
        ))}
      </ul>
    </>
  );
}

function Row({ it, onError }: {
  it: PalaceCandidate; onError: (s: string | null) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function run(fn: (id: number) => Promise<{ ok: boolean; error?: string }>) {
    onError(null);
    start(async () => {
      const r = await fn(it.parlay_id);
      if (!r.ok) { onError(`parlay ${it.parlay_id}: ${r.error}`); return; }
      router.refresh();
    });
  }
  return (
    <li className="border-b border-[var(--color-border)] last:border-b-0 px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <div className="text-[13px] font-bold">
          @{it.capper_handle}{" "}
          <span className="text-[var(--color-text-muted)] font-medium">
            {it.leg_count}-leg · +{it.combined_odds} ·
            +{it.profit_units.toFixed(2)}u
          </span>
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
          status: {it.status} · graded {it.graded_at?.slice(0, 10)}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => run(enrichAction)} disabled={pending}
          className="px-3 py-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded text-[11px] font-bold">
          {pending ? "..." : "Enrich"}
        </button>
        <button onClick={() => run(publishAction)} disabled={pending}
          className="px-3 py-1 bg-[var(--color-pos)] text-black rounded text-[11px] font-bold">
          Publish
        </button>
        <button onClick={() => run(unpublishAction)} disabled={pending}
          className="px-3 py-1 bg-[var(--color-neg)] text-white rounded text-[11px] font-bold">
          Pull
        </button>
      </div>
    </li>
  );
}
